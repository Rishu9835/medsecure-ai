import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import Card from '../components/Card';
import { generateOTP, verifyOTP } from '../api';
import { 
  QrCode, 
  Camera, 
  CheckCircle, 
  XCircle, 
  MapPin,
  Phone,
  Key,
  Unlock,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';

const QRScanner = () => {
  const [scanning, setScanning] = useState(false);
  const [scannedData, setScannedData] = useState(null);
  const [otpData, setOtpData] = useState(null);
  const [otp, setOtp] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [currentLocation, setCurrentLocation] = useState(null);
  
  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);

  useEffect(() => {
    // Get current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCurrentLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          });
        },
        (err) => {
          console.error('Geolocation error:', err);
          // Default location for demo
          setCurrentLocation({ lat: 28.6139, lng: 77.2090 });
        }
      );
    }

    return () => {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const startScanning = async () => {
    setError('');
    setScannedData(null);
    setOtpData(null);
    setResult(null);
    setScanning(true);  // Set scanning true FIRST so div is visible
    
    // Wait for DOM to update
    await new Promise(resolve => setTimeout(resolve, 100));
    
    try {
      html5QrCodeRef.current = new Html5Qrcode("qr-reader");
      
      await html5QrCodeRef.current.start(
        { facingMode: "environment" },
        { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        async (decodedText) => {
          try {
            const data = JSON.parse(decodedText);
            
            // Stop scanning first
            await html5QrCodeRef.current.stop();
            setScanning(false);
            setScannedData(data);
            
            // Generate OTP
            const res = await generateOTP(data.unique_id);
            setOtpData(res.data);
          } catch (err) {
            setError('Invalid QR code format');
          }
        },
        (err) => {
          // Ignore scanning errors
        }
      );
    } catch (err) {
      setScanning(false);
      setError('Failed to start camera. Please allow camera access.');
      console.error(err);
    }
  };

  const stopScanning = async () => {
    if (html5QrCodeRef.current) {
      await html5QrCodeRef.current.stop();
    }
    setScanning(false);
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 4) {
      setError('Please enter a 4-digit OTP');
      return;
    }
    
    if (!currentLocation) {
      setError('Location not available');
      return;
    }

    setVerifying(true);
    setError('');

    try {
      const res = await verifyOTP(
        scannedData.unique_id,
        otp,
        currentLocation.lat,
        currentLocation.lng,
        'BOX_001'
      );
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const reset = () => {
    setScannedData(null);
    setOtpData(null);
    setOtp('');
    setResult(null);
    setError('');
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
      {/* Header */}
      <div className="border-b border-white/5 pb-4">
        <h1 className="text-2xl font-bold text-forensic-text uppercase tracking-forensic">QR SCANNER</h1>
        <p className="text-xs text-forensic-text-dim font-mono mt-1 tracking-wide uppercase">
          FIELD VERIFICATION TERMINAL // UNLOCK PROTOCOL
        </p>
      </div>

      {error && (
        <Card className="p-4 bg-forensic-blood-red/10 border border-forensic-blood-red/30">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-forensic-blood-red" strokeWidth={1.5} />
            <p className="text-forensic-blood-red text-xs font-mono uppercase tracking-wide">{error}</p>
          </div>
        </Card>
      )}

      {/* Scanner Section */}
      {!scannedData && (
        <Card className="p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-forensic-orange/10 border border-forensic-orange/30 flex items-center justify-center mx-auto mb-4">
              <QrCode className="w-8 h-8 text-forensic-orange" strokeWidth={1.5} />
            </div>
            <h2 className="text-base font-bold text-forensic-text mb-2 uppercase tracking-wide">
              SCAN PACKAGE QR CODE
            </h2>
            <p className="text-forensic-text-muted text-xs mb-6 font-mono">
              ALIGN CAMERA WITH TARGET QR MATRIX
            </p>
            
            <div 
              id="qr-reader" 
              className="mx-auto mb-6 overflow-hidden border border-white/10"
              style={{ 
                width: '100%', 
                maxWidth: '400px',
                minHeight: scanning ? '300px' : '0px',
                display: scanning ? 'block' : 'none'
              }}
            />
            
            {!scanning ? (
              <button
                onClick={startScanning}
                className="flex items-center gap-2 px-6 py-3 bg-forensic-orange/20 text-forensic-orange border border-forensic-orange/30 hover:bg-forensic-orange/30 hover:shadow-forensic-glow transition-all duration-100 mx-auto uppercase text-xs tracking-wide font-medium"
              >
                <Camera className="w-4 h-4" strokeWidth={1.5} />
                INITIALIZE SCANNER
              </button>
            ) : (
              <button
                onClick={stopScanning}
                className="flex items-center gap-2 px-6 py-3 bg-forensic-blood-red/20 text-forensic-blood-red border border-forensic-blood-red/30 hover:bg-forensic-blood-red/30 transition-all duration-100 mx-auto uppercase text-xs tracking-wide font-medium"
              >
                <XCircle className="w-4 h-4" strokeWidth={1.5} />
                TERMINATE
              </button>
            )}
          </div>
        </Card>
      )}

      {/* OTP Section */}
      {scannedData && otpData && !result && (
        <Card className="p-6">
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-forensic-green-live/10 border border-forensic-green-live/30 flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-6 h-6 text-forensic-green-live" strokeWidth={1.5} />
            </div>
            <h2 className="text-base font-bold text-forensic-text uppercase tracking-wide">
              QR MATRIX DECODED
            </h2>
          </div>

          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-3 p-3 bg-forensic-surface-high border border-white/5">
              <div className="w-8 h-8 bg-forensic-orange/10 border border-forensic-orange/30 flex items-center justify-center flex-shrink-0">
                <Key className="w-4 h-4 text-forensic-orange" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-[10px] text-forensic-text-dim uppercase tracking-wide font-mono">SHIPMENT ID</p>
                <p className="text-xs font-bold text-forensic-text font-mono">{scannedData.unique_id}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-forensic-surface-high border border-white/5">
              <div className="w-8 h-8 bg-forensic-orange/10 border border-forensic-orange/30 flex items-center justify-center flex-shrink-0">
                <Phone className="w-4 h-4 text-forensic-orange" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-[10px] text-forensic-text-dim uppercase tracking-wide font-mono">CUSTOMER PHONE</p>
                <p className="text-xs font-bold text-forensic-text font-mono">{scannedData.phone}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-forensic-surface-high border border-white/5">
              <div className="w-8 h-8 bg-forensic-orange/10 border border-forensic-orange/30 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-4 h-4 text-forensic-orange" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-[10px] text-forensic-text-dim uppercase tracking-wide font-mono">CURRENT COORDINATES</p>
                <p className="text-xs font-bold text-forensic-text font-mono">
                  {currentLocation ? `${currentLocation.lat.toFixed(4)}, ${currentLocation.lng.toFixed(4)}` : 'ACQUIRING...'}
                </p>
              </div>
            </div>

            {/* Demo OTP display */}
            <div className="p-3 bg-forensic-sepia-warn/10 border border-forensic-sepia-warn/30 text-center">
              <p className="text-[10px] text-forensic-sepia-warn mb-1 uppercase tracking-wide font-mono">DEMO MODE - OTP:</p>
              <p className="text-2xl font-bold text-forensic-sepia-warn font-mono tracking-wider">{otpData.demo_otp}</p>
            </div>
          </div>

          {/* OTP Input */}
          <div className="mb-6">
            <label className="block text-xs font-medium text-forensic-text-dim mb-3 text-center uppercase tracking-wide font-mono">
              ENTER AUTHORIZATION CODE
            </label>
            <div className="flex justify-center gap-2">
              {[0, 1, 2, 3].map((idx) => (
                <input
                  key={idx}
                  type="text"
                  maxLength={1}
                  value={otp[idx] || ''}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    const newOtp = otp.split('');
                    newOtp[idx] = val;
                    setOtp(newOtp.join(''));
                    // Auto-focus next
                    if (val && idx < 3) {
                      const next = e.target.nextElementSibling;
                      if (next) next.focus();
                    }
                  }}
                  className="w-14 h-14 text-center text-2xl font-bold bg-forensic-bg-elevated border border-white/10 text-forensic-text font-mono focus:outline-none focus:border-forensic-orange transition-all duration-100"
                />
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={reset}
              className="flex-1 py-3 px-4 bg-white/5 text-forensic-text-dim border border-white/10 hover:bg-white/10 transition-all duration-100 uppercase text-xs tracking-wide font-medium"
            >
              ABORT
            </button>
            <button
              onClick={handleVerifyOTP}
              disabled={verifying || otp.length !== 4}
              className="flex-1 py-3 px-4 bg-forensic-orange/20 text-forensic-orange border border-forensic-orange/30 hover:bg-forensic-orange/30 hover:shadow-forensic-glow transition-all duration-100 disabled:opacity-50 flex items-center justify-center gap-2 uppercase text-xs tracking-wide font-medium"
            >
              {verifying ? (
                <RefreshCw className="w-4 h-4 animate-spin" strokeWidth={1.5} />
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" strokeWidth={1.5} />
                  VERIFY
                </>
              )}
            </button>
          </div>
        </Card>
      )}

      {/* Result Section */}
      {result && (
        <Card className={`p-8 ${result.unlock ? 'border-forensic-green-live border-2' : 'border-forensic-blood-red border-2'}`}>
          <div className="text-center">
            {result.unlock ? (
              <>
                <div className="w-20 h-20 bg-forensic-green-live/10 border border-forensic-green-live/30 flex items-center justify-center mx-auto mb-4 animate-pulse-glow">
                  <Unlock className="w-10 h-10 text-forensic-green-live" strokeWidth={1.5} />
                </div>
                <h2 className="text-xl font-bold text-forensic-green-live mb-2 uppercase tracking-wide">
                  ACCESS GRANTED
                </h2>
              </>
            ) : (
              <>
                <div className="w-20 h-20 bg-forensic-blood-red/10 border border-forensic-blood-red/30 flex items-center justify-center mx-auto mb-4">
                  <XCircle className="w-10 h-10 text-forensic-blood-red" strokeWidth={1.5} />
                </div>
                <h2 className="text-xl font-bold text-forensic-blood-red mb-2 uppercase tracking-wide">
                  ACCESS DENIED
                </h2>
              </>
            )}
            <p className="text-forensic-text-muted text-xs font-mono uppercase tracking-wide">{result.message}</p>

            <button
              onClick={reset}
              className="mt-6 px-6 py-3 bg-forensic-orange/20 text-forensic-orange border border-forensic-orange/30 hover:bg-forensic-orange/30 hover:shadow-forensic-glow transition-all duration-100 uppercase text-xs tracking-wide font-medium"
            >
              NEW SCAN
            </button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default QRScanner;
