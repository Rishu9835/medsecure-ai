/*
 * Aegix AI - ESP32 Firmware  (servo-jitter-fixed v2)
 *
 * Fixes applied vs original:
 *   1. Timer changed from 0 → 3  (avoids WiFi internal timer conflict)
 *   2. Non-blocking servo sweep using millis() instead of delay()
 *   3. servoWrite() only called when position actually changes
 *   4. Servo detached after reaching target (removes PWM noise at rest)
 *   5. Capacitor note added for hardware power fix
 *
 * Hardware:
 *   DHT22  : GPIO 4
 *   NEO-6M : UART1  RX=16, TX=17
 *   MPU6050: I2C    SDA=21, SCL=22
 *   Servo  : GPIO 25  — use SEPARATE 5V supply + 100µF cap across servo VCC/GND
 */

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <TinyGPS++.h>
#include <DHT.h>
#include <ESP32Servo.h>
#include <ArduinoJson.h>

// ==================== CONFIGURATION ====================

const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
// Use HTTPS for Railway deployment (no port needed)
const char* SERVER_URL    = "https://YOUR_RAILWAY_URL.up.railway.app";
const char* DEVICE_ID     = "BOX_001";

#define DHT_PIN   4
#define DHT_TYPE  DHT22
#define GPS_RX    16
#define GPS_TX    17
#define SERVO_PIN 25
#define MPU_SDA   21
#define MPU_SCL   22
#define MPU_ADDR  0x68

// Servo angles
#define LOCK_POS   0
#define UNLOCK_POS 180

// Sweep speed: degrees per millisecond  (lower = slower/smoother)
#define SERVO_STEP_DEG    1        // move 1 degree per step
#define SERVO_STEP_MS     18       // milliseconds between each step

// Timing
#define DATA_SEND_INTERVAL    4000
#define COMMAND_CHECK_INTERVAL 2000
#define HTTP_TIMEOUT          10000

// ==================== GLOBALS ====================

DHT           dht(DHT_PIN, DHT_TYPE);
TinyGPSPlus   gps;
HardwareSerial gpsSerial(1);
Servo         lockServo;

// Sensor data
float temperature  = 4.0;
float humidity     = 50.0;
float shock        = 1.0;
float gpsLat       = 28.6139;
float gpsLng       = 77.2090;
String gpsStatus   = "NO_FIX";
float lastKnownLat = 28.6139;
float lastKnownLng = 77.2090;
bool  hasValidGPS  = false;

// Lock state
bool isLocked      = true;
bool overrideActive = false;

// ── Non-blocking servo state ──────────────────────────────────────────────────
int  servoCurrentPos  = LOCK_POS;   // where the arm physically is right now
int  servoTargetPos   = LOCK_POS;   // where we want it to go
bool servoMoving      = false;       // true while a sweep is in progress
bool servoAttached    = false;       // track attach/detach state
unsigned long lastServoStep = 0;     // millis() of last degree step

// Timing
unsigned long lastDataSend    = 0;
unsigned long lastCommandCheck = 0;

// ==================== HELPERS ====================

void servoAttachIfNeeded() {
  if (!servoAttached) {
    // FIX 1: Use timer 3 — furthest from WiFi-reserved timers (0/1)
    ESP32PWM::allocateTimer(3);
    lockServo.setPeriodHertz(50);
    lockServo.attach(SERVO_PIN, 500, 2400);
    servoAttached = true;
    delay(20);  // let the PWM stabilise before first write
  }
}

void servoDetach() {
  if (servoAttached) {
    // FIX 4: Detach after reaching position — removes idle PWM noise
    // The servo holds its position mechanically; no need for continuous signal.
    lockServo.detach();
    servoAttached = false;
  }
}

// Move servo to target position (blocking) — needed because HTTP calls block the loop
void servoMoveTo(int targetPos) {
  if (targetPos == servoCurrentPos && !servoMoving) return;
  
  Serial.printf("[SERVO] Moving: %d -> %d\n", servoCurrentPos, targetPos);
  servoAttachIfNeeded();
  
  // Blocking sweep — required because HTTP blocks loop() for seconds
  while (servoCurrentPos != targetPos) {
    if (servoCurrentPos < targetPos) {
      servoCurrentPos += SERVO_STEP_DEG;
      if (servoCurrentPos > targetPos) servoCurrentPos = targetPos;
    } else {
      servoCurrentPos -= SERVO_STEP_DEG;
      if (servoCurrentPos < targetPos) servoCurrentPos = targetPos;
    }
    lockServo.write(servoCurrentPos);
    delay(SERVO_STEP_MS);
  }
  
  servoTargetPos = targetPos;
  servoMoving = false;
  delay(50);
  servoDetach();
  Serial.printf("[SERVO] Reached position %d — PWM detached\n", servoCurrentPos);
}

// updateServo() is no longer needed — servoMoveTo() is now blocking
// Kept for reference but not called in loop()

// ==================== SETUP ====================

void setup() {
  Serial.begin(115200);
  Serial.println("\n========================================");
  Serial.println("   Aegix AI - ESP32 (jitter-fixed)");
  Serial.println("========================================\n");

  Wire.begin(MPU_SDA, MPU_SCL);

  dht.begin();
  Serial.println("[OK] DHT22 ready");

  gpsSerial.begin(9600, SERIAL_8N1, GPS_RX, GPS_TX);
  Serial.println("[OK] GPS UART ready");

  initMPU6050();
  Serial.println("[OK] MPU6050 ready");

  // Move to locked position once at boot, then detach
  servoAttachIfNeeded();
  lockServo.write(LOCK_POS);
  servoCurrentPos = LOCK_POS;
  servoTargetPos  = LOCK_POS;
  delay(600);           // wait for arm to physically reach position
  servoDetach();
  Serial.println("[OK] Servo initialised (LOCKED, PWM detached)");

  connectWiFi();
  Serial.println("\n[READY] System online\n");
}

// ==================== MAIN LOOP ====================

void loop() {
  unsigned long now = millis();

  // Read sensors
  readDHT();
  readGPS();
  readMPU6050();

  // Send sensor data
  if (now - lastDataSend >= DATA_SEND_INTERVAL) {
    lastDataSend = now;
    if (WiFi.status() == WL_CONNECTED) {
      sendSensorData();
    } else {
      Serial.println("[WIFI] Reconnecting...");
      connectWiFi();
    }
  }

  // Poll for commands
  if (now - lastCommandCheck >= COMMAND_CHECK_INTERVAL) {
    lastCommandCheck = now;
    if (WiFi.status() == WL_CONNECTED) {
      checkCommand();
    }
  }

  // No delay() here — keeps loop fast for non-blocking servo
}

// ==================== WIFI ====================

void connectWiFi() {
  Serial.printf("[WIFI] Connecting to %s", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int tries = 0;
  while (WiFi.status() != WL_CONNECTED && tries < 30) {
    delay(500); Serial.print("."); tries++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf(" OK  IP: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println(" FAILED");
  }
}

// ==================== SENSORS ====================

void readDHT() {
  float t = dht.readTemperature();
  float h = dht.readHumidity();
  if (!isnan(t)) temperature = t;
  if (!isnan(h)) humidity    = h;
}

void readGPS() {
  while (gpsSerial.available() > 0) gps.encode(gpsSerial.read());
  if (gps.location.isValid() && gps.location.isUpdated()) {
    gpsLat = gps.location.lat();
    gpsLng = gps.location.lng();
    lastKnownLat = gpsLat;
    lastKnownLng = gpsLng;
    gpsStatus = "LIVE";
    hasValidGPS = true;
  } else {
    gpsLat = lastKnownLat;
    gpsLng = lastKnownLng;
    gpsStatus = hasValidGPS ? "LAST_KNOWN" : "NO_FIX";
  }
}

void initMPU6050() {
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x6B);
  Wire.write(0);
  Wire.endTransmission(true);
  delay(100);
}

void readMPU6050() {
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x3B);
  Wire.endTransmission(false);
  Wire.requestFrom((uint8_t)MPU_ADDR, (uint8_t)6, (uint8_t)1);
  int16_t ax = Wire.read() << 8 | Wire.read();
  int16_t ay = Wire.read() << 8 | Wire.read();
  int16_t az = Wire.read() << 8 | Wire.read();
  float mag = sqrt((float)ax*ax + (float)ay*ay + (float)az*az) / 16384.0f;
  shock = (mag > 1.05f) ? mag : 1.0f;
}

// ==================== HTTP ====================

// WiFiClientSecure for HTTPS connections
WiFiClientSecure secureClient;

void sendSensorData() {
  secureClient.setInsecure();  // Skip certificate verification (for Railway)
  HTTPClient http;
  http.begin(secureClient, String(SERVER_URL) + "/data");
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(HTTP_TIMEOUT);

  StaticJsonDocument<256> doc;
  doc["device_id"]  = DEVICE_ID;
  doc["temperature"] = temperature;
  doc["humidity"]    = humidity;
  doc["shock"]       = shock;
  doc["gps_lat"]     = gpsLat;
  doc["gps_lng"]     = gpsLng;
  doc["gps_status"]  = gpsStatus;

  String payload;
  serializeJson(doc, payload);
  int code = http.POST(payload);

  if (code > 0) {
    Serial.printf("[DATA] T=%.1f°C H=%.1f%% S=%.2fg GPS=%s\n",
                  temperature, humidity, shock, gpsStatus.c_str());
  } else {
    Serial.printf("[DATA] Error: %s\n", http.errorToString(code).c_str());
  }
  http.end();
}

void checkCommand() {
  secureClient.setInsecure();  // Skip certificate verification (for Railway)
  HTTPClient http;
  String url = String(SERVER_URL) + "/command?device_id=" + DEVICE_ID;
  Serial.printf("[CMD] Fetching: %s\n", url.c_str());
  
  http.begin(secureClient, url);
  http.setTimeout(HTTP_TIMEOUT);
  int code = http.GET();

  Serial.printf("[CMD] HTTP code: %d\n", code);

  if (code == 200) {
    String response = http.getString();
    Serial.printf("[CMD] Response: %s\n", response.c_str());
    
    StaticJsonDocument<128> doc;
    DeserializationError err = deserializeJson(doc, response);
    if (err) {
      Serial.printf("[CMD] JSON parse error: %s\n", err.c_str());
    } else {
      bool newLock     = doc["lock"]     | true;
      bool newOverride = doc["override"] | false;
      
      Serial.printf("[CMD] Parsed: lock=%d override=%d | Current: isLocked=%d overrideActive=%d\n", 
                    newLock, newOverride, isLocked, overrideActive);

      if (newOverride) {
        if (!overrideActive) {
          Serial.println("[CMD] Override ACTIVE — unlocking");
          overrideActive = true;
          isLocked = false;
          servoMoveTo(UNLOCK_POS);
        }
      } else {
        if (overrideActive) {
          overrideActive = false;
        }

        if (newLock && !isLocked) {
          Serial.println("[CMD] Locking");
          isLocked = true;
          servoMoveTo(LOCK_POS);
        } else if (!newLock && isLocked) {
          Serial.println("[CMD] Unlocking");
          isLocked = false;
          servoMoveTo(UNLOCK_POS);
        }
      }
    }
  } else if (code < 0) {
    Serial.printf("[CMD] Connection error: %s\n", http.errorToString(code).c_str());
  } else {
    Serial.printf("[CMD] Unexpected HTTP code: %d\n", code);
  }
  http.end();
}
// ==================== DEBUG FUNCTIONS ====================

void printStatus() {
  Serial.println("\n--- Status ---");
  Serial.printf("Temperature: %.1f°C\n", temperature);
  Serial.printf("Humidity: %.1f%%\n", humidity);
  Serial.printf("Shock: %.2fg\n", shock);
  Serial.printf("GPS: %.6f, %.6f (%s)\n", gpsLat, gpsLng, gpsStatus.c_str());
  Serial.printf("Lock: %s | Override: %s\n", 
                isLocked ? "LOCKED" : "UNLOCKED",
                overrideActive ? "ACTIVE" : "OFF");
  Serial.println("--------------\n");
}
