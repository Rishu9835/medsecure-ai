import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import Shipment
from schemas import ShipmentCreate, ShipmentResponse
from auth import get_admin_user, get_current_user, User
import qrcode
import io
import base64

router = APIRouter(prefix="/shipment", tags=["Shipment"])

@router.post("/create", response_model=ShipmentResponse)
def create_shipment(
    shipment: ShipmentCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Create a new shipment with unique ID"""
    unique_id = f"MED-{uuid.uuid4().hex[:8].upper()}"
    
    db_shipment = Shipment(
        unique_id=unique_id,
        customer_phone=shipment.customer_phone,
        lat=shipment.lat,
        lng=shipment.lng,
        radius=shipment.radius,
        status="pending",
        assigned_driver_email=shipment.assigned_driver_email
    )
    db.add(db_shipment)
    db.commit()
    db.refresh(db_shipment)
    return db_shipment

@router.get("/all", response_model=List[ShipmentResponse])
def get_all_shipments(
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Get all shipments"""
    return db.query(Shipment).order_by(Shipment.created_at.desc()).all()

@router.get("/my-shipments", response_model=List[ShipmentResponse])
def get_driver_shipments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get shipments assigned to the logged-in driver"""
    return db.query(Shipment).filter(
        Shipment.assigned_driver_email == current_user.email
    ).order_by(Shipment.created_at.desc()).all()

@router.get("/qr/{unique_id}")
def get_qr_code(unique_id: str, db: Session = Depends(get_db)):
    """Generate QR code for a shipment"""
    shipment = db.query(Shipment).filter(Shipment.unique_id == unique_id).first()
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
    
    # QR data
    qr_data = f'{{"unique_id": "{shipment.unique_id}", "phone": "{shipment.customer_phone}"}}'
    
    # Generate QR
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(qr_data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Convert to base64
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    img_str = base64.b64encode(buffer.getvalue()).decode()
    
    return {
        "qr_base64": f"data:image/png;base64,{img_str}",
        "qr_data": qr_data
    }

@router.patch("/{unique_id}/status")
def update_shipment_status(
    unique_id: str,
    status: str,
    db: Session = Depends(get_db)
):
    """Update shipment status"""
    shipment = db.query(Shipment).filter(Shipment.unique_id == unique_id).first()
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
    
    shipment.status = status
    db.commit()
    return {"success": True, "status": status}

@router.delete("/{unique_id}")
def delete_shipment(
    unique_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Delete a shipment"""
    shipment = db.query(Shipment).filter(Shipment.unique_id == unique_id).first()
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
    
    db.delete(shipment)
    db.commit()
    return {"success": True, "message": f"Shipment {unique_id} deleted"}
