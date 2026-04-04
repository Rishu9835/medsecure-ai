from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from database import get_db
from models import SensorData, Command, Shipment, TamperAlert
from schemas import SensorDataResponse, AnalyticsResponse, OverrideLockRequest, TamperAlertResponse
from auth import get_admin_user, User

router = APIRouter(prefix="/admin", tags=["Admin"])

@router.get("/data", response_model=List[SensorDataResponse])
def get_sensor_data(
    limit: int = 100,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Get latest sensor data for admin dashboard"""
    data = db.query(SensorData).order_by(SensorData.timestamp.desc()).limit(limit).all()
    return data

@router.get("/alerts", response_model=List[TamperAlertResponse])
def get_tamper_alerts(
    limit: int = 50,
    unread_only: bool = False,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Get tamper alerts for admin"""
    query = db.query(TamperAlert)
    if unread_only:
        query = query.filter(TamperAlert.is_read == False)
    alerts = query.order_by(TamperAlert.timestamp.desc()).limit(limit).all()
    return alerts

@router.get("/alerts/count")
def get_unread_alert_count(
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Get count of unread tamper alerts"""
    count = db.query(TamperAlert).filter(TamperAlert.is_read == False).count()
    return {"unread_count": count}

@router.patch("/alerts/{alert_id}/read")
def mark_alert_read(
    alert_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Mark a tamper alert as read"""
    alert = db.query(TamperAlert).filter(TamperAlert.id == alert_id).first()
    if not alert:
        return {"success": False, "message": "Alert not found"}
    alert.is_read = True
    db.commit()
    return {"success": True}

@router.patch("/alerts/read-all")
def mark_all_alerts_read(
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Mark all tamper alerts as read"""
    db.query(TamperAlert).filter(TamperAlert.is_read == False).update({"is_read": True})
    db.commit()
    return {"success": True}

@router.get("/analytics", response_model=AnalyticsResponse)
def get_analytics(
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Get analytics data for admin dashboard"""
    # Shipment counts
    total = db.query(Shipment).count()
    pending = db.query(Shipment).filter(Shipment.status == "pending").count()
    in_transit = db.query(Shipment).filter(Shipment.status == "in_transit").count()
    delivered = db.query(Shipment).filter(Shipment.status == "delivered").count()
    
    # Sensor averages
    avg_temp = db.query(func.avg(SensorData.temperature)).scalar() or 0
    avg_humidity = db.query(func.avg(SensorData.humidity)).scalar() or 0
    shock_alerts = db.query(SensorData).filter(SensorData.shock > 1.5).count()
    
    # Sensor history (last 50 readings)
    history = db.query(SensorData).order_by(SensorData.timestamp.desc()).limit(50).all()
    sensor_history = [
        {
            "timestamp": h.timestamp.isoformat(),
            "temperature": h.temperature,
            "humidity": h.humidity,
            "shock": h.shock
        }
        for h in reversed(history)
    ]
    
    return AnalyticsResponse(
        total_shipments=total,
        pending=pending,
        in_transit=in_transit,
        delivered=delivered,
        avg_temperature=round(avg_temp, 2),
        avg_humidity=round(avg_humidity, 2),
        shock_alerts=shock_alerts,
        sensor_history=sensor_history
    )

@router.post("/override-lock")
def override_lock(
    request: OverrideLockRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Override lock for a device - Box is ALWAYS locked unless override is active"""
    # Find existing command or create new
    command = db.query(Command).filter(Command.device_id == request.device_id).first()
    
    if command:
        command.override = request.override
        # When override is enabled -> unlock, when disabled -> lock
        command.lock = not request.override
    else:
        command = Command(
            device_id=request.device_id,
            lock=not request.override,  # Locked by default unless override
            override=request.override
        )
        db.add(command)
    
    db.commit()
    db.refresh(command)
    
    status = "UNLOCKED (Override Active)" if request.override else "LOCKED"
    print(f"🔐 Admin override: {request.device_id} -> {status}")
    
    return {"success": True, "message": f"Box {status}", "lock": command.lock}
