import random
import math
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Shipment, Command, TamperAlert, User
from schemas import OTPGenerateRequest, OTPVerifyRequest, OTPVerifyResponse
from email_service import send_tamper_alert_email

router = APIRouter(prefix="/otp", tags=["OTP"])

# Auto-lock delay in seconds (lock box after this time)
AUTO_LOCK_DELAY = 30

def get_admin_email(db: Session) -> str:
    """Get admin email from database"""
    admin = db.query(User).filter(User.role == "admin").first()
    return admin.email if admin else None

def haversine_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate distance between two coordinates in meters using Haversine formula"""
    R = 6371000  # Earth's radius in meters
    
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lng2 - lng1)
    
    a = math.sin(delta_phi / 2) ** 2 + \
        math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    return R * c

def create_tamper_alert(db: Session, device_id: str, shipment_id: str, alert_type: str, 
                         message: str, current_lat: float, current_lng: float,
                         target_lat: float = None, target_lng: float = None, distance: float = None):
    """Create a tamper alert and notify admin via Email"""
    alert = TamperAlert(
        device_id=device_id,
        shipment_id=shipment_id,
        alert_type=alert_type,
        message=message,
        current_lat=current_lat,
        current_lng=current_lng,
        target_lat=target_lat,
        target_lng=target_lng,
        distance=distance
    )
    db.add(alert)
    db.commit()
    
    # Print alert to console for visibility
    print(f"\n{'🚨'*20}")
    print(f"⚠️  TAMPER ALERT: {alert_type}")
    print(f"📦 Device: {device_id} | Shipment: {shipment_id}")
    print(f"📍 Location: ({current_lat}, {current_lng})")
    if distance:
        print(f"📏 Distance from authorized zone: {distance:.0f}m")
    print(f"💬 {message}")
    print(f"{'🚨'*20}\n")
    
    # Send Email alert to admin
    admin_email = get_admin_email(db)
    if admin_email:
        send_tamper_alert_email(
            to_email=admin_email,
            alert_type=alert_type,
            message=message,
            device_id=device_id,
            location=(current_lat, current_lng) if current_lat and current_lng else None,
            distance=distance
        )
    
    return alert

@router.post("/generate")
def generate_otp(request: OTPGenerateRequest, db: Session = Depends(get_db)):
    """Generate OTP for a shipment (triggered when driver scans QR) - DEMO MODE"""
    shipment = db.query(Shipment).filter(Shipment.unique_id == request.unique_id).first()
    
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
    
    # Generate 4-digit OTP
    otp = str(random.randint(1000, 9999))
    shipment.otp = otp
    shipment.status = "in_transit"
    db.commit()
    
    # Demo mode - just print OTP to console
    print(f"\n{'='*50}")
    print(f"📱 OTP GENERATED FOR SHIPMENT: {shipment.unique_id}")
    print(f"📞 Customer Phone: {shipment.customer_phone}")
    print(f"🔐 OTP: {otp}")
    print(f"{'='*50}\n")
    
    return {
        "success": True,
        "message": f"OTP generated for {shipment.customer_phone}",
        "phone": shipment.customer_phone,
        # Demo mode - always include OTP in response
        "demo_otp": otp
    }

@router.post("/verify", response_model=OTPVerifyResponse)
def verify_otp(request: OTPVerifyRequest, db: Session = Depends(get_db)):
    """Verify OTP and check geofence for unlock"""
    shipment = db.query(Shipment).filter(Shipment.unique_id == request.unique_id).first()
    
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
    
    # Verify OTP
    if shipment.otp != request.otp:
        return OTPVerifyResponse(
            success=False,
            message="Invalid OTP",
            unlock=False
        )
    
    # Check geofence using Haversine formula
    distance = haversine_distance(
        request.current_lat, request.current_lng,
        shipment.lat, shipment.lng
    )
    
    print(f"\n📍 GEOFENCE CHECK:")
    print(f"   Current: ({request.current_lat}, {request.current_lng})")
    print(f"   Target: ({shipment.lat}, {shipment.lng})")
    print(f"   Distance: {distance:.2f}m, Radius: {shipment.radius}m")
    
    if distance > shipment.radius:
        # 🚨 TAMPER ALERT - Unauthorized location attempt
        create_tamper_alert(
            db=db,
            device_id=request.device_id,
            shipment_id=request.unique_id,
            alert_type="UNAUTHORIZED_LOCATION",
            message=f"Unlock attempt {distance:.0f}m away from authorized zone (limit: {shipment.radius}m)",
            current_lat=request.current_lat,
            current_lng=request.current_lng,
            target_lat=shipment.lat,
            target_lng=shipment.lng,
            distance=distance
        )
        
        return OTPVerifyResponse(
            success=True,
            message=f"⚠️ TAMPER ALERT! Outside delivery zone. Distance: {distance:.0f}m, Allowed: {shipment.radius}m",
            unlock=False
        )
    
    # OTP valid AND inside geofence -> Unlock temporarily
    command = db.query(Command).filter(Command.device_id == request.device_id).first()
    if command:
        command.lock = False
        command.override = False
    else:
        command = Command(device_id=request.device_id, lock=False, override=False)
        db.add(command)
    
    # Update shipment status
    shipment.status = "delivered"
    shipment.otp = None  # Clear OTP after use
    db.commit()
    
    print(f"✅ Box UNLOCKED for delivery. Will auto-lock in {AUTO_LOCK_DELAY}s")
    
    return OTPVerifyResponse(
        success=True,
        message=f"Verification successful! Box unlocked for {AUTO_LOCK_DELAY} seconds.",
        unlock=True
    )

@router.post("/lock")
def lock_box(device_id: str = "BOX_001", db: Session = Depends(get_db)):
    """Manually lock the box (or auto-lock after delivery)"""
    command = db.query(Command).filter(Command.device_id == device_id).first()
    if command:
        command.lock = True
        command.override = False
    else:
        command = Command(device_id=device_id, lock=True, override=False)
        db.add(command)
    db.commit()
    
    print(f"🔒 Box {device_id} LOCKED")
    return {"success": True, "message": "Box locked"}
