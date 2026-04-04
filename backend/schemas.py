from pydantic import BaseModel
from typing import Optional
from datetime import datetime

# Auth Schemas
class UserCreate(BaseModel):
    email: str
    password: str
    role: str  # "admin" or "driver"

class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str

class UserResponse(BaseModel):
    id: int
    email: str
    role: str
    
    class Config:
        from_attributes = True

# Sensor Data Schemas
class SensorDataCreate(BaseModel):
    device_id: str
    temperature: float
    humidity: float
    shock: float
    gps_lat: float
    gps_lng: float
    gps_status: str

class SensorDataResponse(BaseModel):
    id: int
    device_id: str
    temperature: float
    humidity: float
    shock: float
    gps_lat: float
    gps_lng: float
    gps_status: str
    timestamp: datetime
    
    class Config:
        from_attributes = True

# Command Schemas
class CommandResponse(BaseModel):
    lock: bool
    override: bool

class OverrideLockRequest(BaseModel):
    device_id: str
    override: bool

# Shipment Schemas
class ShipmentCreate(BaseModel):
    customer_phone: str
    lat: float
    lng: float
    radius: float
    assigned_driver_email: Optional[str] = None

class ShipmentResponse(BaseModel):
    id: int
    unique_id: str
    customer_phone: str
    otp: Optional[str]
    lat: float
    lng: float
    radius: float
    status: str
    assigned_driver_email: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True

# OTP Schemas
class OTPGenerateRequest(BaseModel):
    unique_id: str

class OTPVerifyRequest(BaseModel):
    unique_id: str
    otp: str
    current_lat: float
    current_lng: float
    device_id: str

class OTPVerifyResponse(BaseModel):
    success: bool
    message: str
    unlock: bool

# Tamper Alert Schemas
class TamperAlertCreate(BaseModel):
    device_id: str
    shipment_id: Optional[str] = None
    alert_type: str
    message: str
    current_lat: float
    current_lng: float
    target_lat: Optional[float] = None
    target_lng: Optional[float] = None
    distance: Optional[float] = None

class TamperAlertResponse(BaseModel):
    id: int
    device_id: str
    shipment_id: Optional[str]
    alert_type: str
    message: str
    current_lat: float
    current_lng: float
    target_lat: Optional[float]
    target_lng: Optional[float]
    distance: Optional[float]
    is_read: bool
    timestamp: datetime
    
    class Config:
        from_attributes = True

# Analytics Schema
class AnalyticsResponse(BaseModel):
    total_shipments: int
    pending: int
    in_transit: int
    delivered: int
    avg_temperature: float
    avg_humidity: float
    shock_alerts: int
    sensor_history: list
