from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import SensorData, Command, TamperAlert, User
from schemas import SensorDataCreate, CommandResponse, SensorDataResponse
from typing import List
from safe_score import calculate_safe_score, should_alert, SCORE_CRITICAL
from email_service import send_safe_score_alert, send_tamper_alert_email

router = APIRouter(tags=["Device"])

# Shock threshold for tamper detection (matches safe_score.py)
SHOCK_TAMPER_THRESHOLD = 1.5

# Track last score for delta alerts
last_safe_scores = {}

def get_admin_email(db: Session) -> str:
    """Get admin email from database"""
    admin = db.query(User).filter(User.role == "admin").first()
    return admin.email if admin else None

@router.post("/data")
def post_sensor_data(data: SensorDataCreate, db: Session = Depends(get_db)):
    """Receive sensor data from ESP32"""
    sensor_data = SensorData(
        device_id=data.device_id,
        temperature=data.temperature,
        humidity=data.humidity,
        shock=data.shock,
        gps_lat=data.gps_lat,
        gps_lng=data.gps_lng,
        gps_status=data.gps_status
    )
    db.add(sensor_data)
    db.commit()
    db.refresh(sensor_data)
    
    # Calculate safe score
    score, issues = calculate_safe_score(
        temperature=data.temperature,
        humidity=data.humidity,
        shock=data.shock,
        gps_status=data.gps_status
    )
    
    # Get previous score for this device
    previous_score = last_safe_scores.get(data.device_id)
    last_safe_scores[data.device_id] = score
    
    # Check if we need to send email alert
    if should_alert(score, previous_score):
        admin_email = get_admin_email(db)
        if admin_email:
            print(f"📧 Sending safe score alert to {admin_email}")
            send_safe_score_alert(
                to_email=admin_email,
                score=score,
                device_id=data.device_id,
                issues=issues
            )
    
    # 🚨 Check for shock-based tamper alert
    if data.shock >= SHOCK_TAMPER_THRESHOLD:
        from datetime import datetime, timedelta
        recent_alert = db.query(TamperAlert).filter(
            TamperAlert.device_id == data.device_id,
            TamperAlert.alert_type == "SHOCK_DETECTED",
            TamperAlert.timestamp >= datetime.utcnow() - timedelta(seconds=30)
        ).first()
        
        if not recent_alert:
            tamper_alert = TamperAlert(
                device_id=data.device_id,
                alert_type="SHOCK_DETECTED",
                message=f"High shock detected: {data.shock:.2f}g - Possible tampering or rough handling",
                current_lat=data.gps_lat,
                current_lng=data.gps_lng
            )
            db.add(tamper_alert)
            db.commit()
            print(f"🚨 SHOCK TAMPER ALERT: {data.shock:.2f}g from {data.device_id}")
            
            # Send email to admin
            admin_email = get_admin_email(db)
            if admin_email:
                send_tamper_alert_email(
                    to_email=admin_email,
                    alert_type="SHOCK_DETECTED",
                    message=f"High shock detected: {data.shock:.2f}g - Possible tampering or rough handling",
                    device_id=data.device_id,
                    location=(data.gps_lat, data.gps_lng) if data.gps_lat and data.gps_lng else None
                )
    
    return {
        "success": True, 
        "id": sensor_data.id,
        "safe_score": score,
        "issues": issues
    }

@router.get("/command", response_model=CommandResponse)
def get_command(device_id: str = "BOX_001", db: Session = Depends(get_db)):
    """Get command for ESP32 device"""
    command = db.query(Command).filter(Command.device_id == device_id).order_by(Command.timestamp.desc()).first()
    
    if command:
        return CommandResponse(lock=command.lock, override=command.override)
    
    # Default: locked, no override
    return CommandResponse(lock=True, override=False)

@router.get("/sensor/latest", response_model=List[SensorDataResponse])
def get_latest_sensor_data(limit: int = 1, db: Session = Depends(get_db)):
    """Get latest sensor data (public endpoint for driver dashboard)"""
    data = db.query(SensorData).order_by(SensorData.timestamp.desc()).limit(limit).all()
    return data

@router.get("/safe-score")
def get_safe_score(device_id: str = "BOX_001", db: Session = Depends(get_db)):
    """Get current safe score for a device"""
    # Get latest sensor data
    latest = db.query(SensorData).filter(
        SensorData.device_id == device_id
    ).order_by(SensorData.timestamp.desc()).first()
    
    if not latest:
        return {
            "score": 100,
            "status": "NO_DATA",
            "issues": ["No sensor data available"],
            "data": None
        }
    
    score, issues = calculate_safe_score(
        temperature=latest.temperature,
        humidity=latest.humidity,
        shock=latest.shock,
        gps_status=latest.gps_status
    )
    
    from safe_score import get_score_status
    
    return {
        "score": score,
        "status": get_score_status(score),
        "issues": issues,
        "data": {
            "temperature": latest.temperature,
            "humidity": latest.humidity,
            "shock": latest.shock,
            "gps_status": latest.gps_status,
            "timestamp": latest.timestamp.isoformat()
        }
    }
