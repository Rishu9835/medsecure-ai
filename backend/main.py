from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routers import auth, admin, device, shipment, otp

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="MedSecure AI API",
    description="IoT Secure Delivery Box Backend",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(device.router)
app.include_router(shipment.router)
app.include_router(otp.router)

@app.get("/")
def root():
    return {
        "name": "MedSecure AI API",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health")
def health():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
