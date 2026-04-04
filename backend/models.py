from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime
from sqlalchemy.sql import func
from database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    role = Column(String)  # "admin" or "driver"

class Shipment(Base):
    __tablename__ = "shipments"
    
    id = Column(Integer, primary_key=True, index=True)
    unique_id = Column(String, unique=True, index=True)
    customer_phone = Column(String)
    otp = Column(String, nullable=True)
    lat = Column(Float)
    lng = Column(Float)
    radius = Column(Float)  # meters
    status = Column(String, default="pending")  # pending, in_transit, delivered
    assigned_driver_email = Column(String, nullable=True)  # Assigned driver email
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class SensorData(Base):
    __tablename__ = "sensor_data"
    
    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String, index=True)
    temperature = Column(Float)
    humidity = Column(Float)
    shock = Column(Float)
    gps_lat = Column(Float)
    gps_lng = Column(Float)
    gps_status = Column(String)  # "LIVE" or "LAST_KNOWN"
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

class Command(Base):
    __tablename__ = "commands"
    
    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String, index=True)
    lock = Column(Boolean, default=True)
    override = Column(Boolean, default=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

class TamperAlert(Base):
    __tablename__ = "tamper_alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String, index=True)
    shipment_id = Column(String, nullable=True)
    alert_type = Column(String)  # "UNAUTHORIZED_LOCATION", "SHOCK_DETECTED", "FORCED_OPEN"
    message = Column(String)
    current_lat = Column(Float)
    current_lng = Column(Float)
    target_lat = Column(Float, nullable=True)
    target_lng = Column(Float, nullable=True)
    distance = Column(Float, nullable=True)  # meters from authorized zone
    is_read = Column(Boolean, default=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
