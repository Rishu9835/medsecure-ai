# MedSecure AI - IoT Secure Delivery Box System

A production-ready IoT system for secure medical deliveries with real-time tracking, temperature monitoring, OTP verification, and geofencing.

## 🏗️ System Architecture

```
┌─────────────────┐     HTTP/JSON      ┌─────────────────┐
│   ESP32 Box     │◄──────────────────►│  FastAPI Server │
│  (Sensors +     │     POST /data     │  (SQLite DB)    │
│   Servo Lock)   │     GET /command   │                 │
└─────────────────┘                    └────────┬────────┘
                                                │
                                                │ REST API
                                                ▼
                                       ┌─────────────────┐
                                       │ React Frontend  │
                                       │  Admin/Driver   │
                                       └─────────────────┘
```

## 📁 Project Structure

```
COLD_CHAINV2/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── database.py          # SQLite database config
│   ├── models.py            # SQLAlchemy models
│   ├── schemas.py           # Pydantic schemas
│   ├── auth.py              # JWT authentication
│   ├── requirements.txt     # Python dependencies
│   └── routers/
│       ├── auth.py          # Auth endpoints
│       ├── admin.py         # Admin endpoints
│       ├── device.py        # ESP32 endpoints
│       ├── shipment.py      # Shipment management
│       └── otp.py           # OTP verification
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Main app router
│   │   ├── api/index.js     # API client
│   │   ├── context/         # Auth & Theme contexts
│   │   ├── components/      # Shared components
│   │   └── pages/           # Page components
│   ├── package.json
│   └── vite.config.js
└── firmware/
    └── medsecure_esp32.ino  # ESP32 Arduino firmware
```

## 🚀 Quick Start

### 1. Backend Setup

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # Linux/Mac
# or: venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Run server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Backend runs at: `http://localhost:8000`
API Docs: `http://localhost:8000/docs`

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run dev server
npm run dev
```

Frontend runs at: `http://localhost:5173`

### 3. ESP32 Firmware Setup

1. Install Arduino IDE or PlatformIO
2. Install required libraries:
   - DHT sensor library
   - TinyGPS++
   - ESP32Servo
   - ArduinoJson
   - Wire (built-in)
3. Edit `firmware/medsecure_esp32.ino`:
   - Set `WIFI_SSID` and `WIFI_PASSWORD`
   - Set `SERVER_URL` to your backend IP
4. Upload to ESP32

## 🔌 Hardware Connections

| Component | ESP32 Pin |
|-----------|-----------|
| DHT22 Data | GPIO 4 |
| GPS RX | GPIO 16 |
| GPS TX | GPIO 17 |
| MPU6050 SDA | GPIO 21 |
| MPU6050 SCL | GPIO 22 |
| Servo Signal | GPIO 25 |

**Note:** Power servo from external 5V supply (not ESP32 3.3V)

## 📡 API Endpoints

### Authentication
- `POST /auth/signup` - Register new user
- `POST /auth/login` - Login and get JWT token

### Device (ESP32)
- `POST /data` - Submit sensor data
- `GET /command` - Get lock/override state

### Admin
- `GET /admin/data` - Get sensor history
- `GET /admin/analytics` - Get analytics data
- `POST /admin/override-lock` - Override lock control

### Shipments
- `POST /shipment/create` - Create new shipment
- `GET /shipment/all` - List all shipments
- `GET /shipment/qr/{id}` - Get QR code

### OTP
- `POST /otp/generate` - Generate OTP (on QR scan)
- `POST /otp/verify` - Verify OTP + geofence check

## 🔐 Authentication Flow

1. Register as admin or driver via `/auth/signup`
2. Login via `/auth/login` to get JWT token
3. Include token in header: `Authorization: Bearer <token>`

## 📦 Delivery Workflow

1. **Admin creates shipment**
   - Sets customer phone
   - Selects delivery location on map
   - Sets geofence radius
   - System generates unique ID + QR code

2. **Driver scans QR code**
   - QR contains: `{unique_id, phone}`
   - Backend generates 4-digit OTP
   - OTP printed to console (production: SMS to customer)

3. **Customer provides OTP to driver**

4. **Driver enters OTP**
   - Backend verifies OTP
   - Backend checks geofence (Haversine distance)
   - If valid: box unlocks
   - If outside zone: unlock denied

## 🔒 Lock Control Rules

The box unlocks ONLY if:
- OTP is correct AND within geofence radius

OR:
- Admin enables override

## 🌡️ Sensor Data Format

```json
{
  "device_id": "BOX_001",
  "temperature": 4.5,
  "humidity": 45.2,
  "shock": 1.02,
  "gps_lat": 28.6139,
  "gps_lng": 77.2090,
  "gps_status": "LIVE"
}
```

## 📱 Frontend Features

### Admin Dashboard
- Live map with box location
- Real-time sensor readings
- Alert panel (temp/shock warnings)
- Override lock button
- Shipment management
- Analytics with charts

### Driver Dashboard  
- Live sensor data
- Map view
- QR code scanner (camera)
- OTP verification page
- Lock status display

## ⚙️ Configuration

### Backend (`backend/auth.py`)
```python
SECRET_KEY = "your-secret-key"  # Change in production!
```

### Frontend (`frontend/src/api/index.js`)
```javascript
const API_BASE = 'http://localhost:8000';  // Your backend URL
```

### ESP32 (`firmware/medsecure_esp32.ino`)
```cpp
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* SERVER_URL = "http://YOUR_SERVER_IP:8000";
```

## 🧪 Testing Without Hardware

You can test the system without ESP32 by sending mock data:

```bash
# Send mock sensor data
curl -X POST http://localhost:8000/data \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "BOX_001",
    "temperature": 4.5,
    "humidity": 50.0,
    "shock": 1.0,
    "gps_lat": 28.6139,
    "gps_lng": 77.2090,
    "gps_status": "LIVE"
  }'

# Check command
curl http://localhost:8000/command?device_id=BOX_001
```

## 📋 Default Test Accounts

Create via signup:
- Admin: `admin@test.com` / `password` / role: `admin`
- Driver: `driver@test.com` / `password` / role: `driver`

## 🛡️ Security Notes

- Change `SECRET_KEY` in production
- Use HTTPS in production
- Store credentials in environment variables
- Enable CORS restrictions for production domain

## 📝 License

MIT License - Free to use and modify.
