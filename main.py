# main.py - OwnBot FastAPI Application Entry Point

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging
from typing import List

# Import database and models
from app.database import engine, SessionLocal, Base
from app import models, schemas

# Import routers
from app.routes import clients, documents, subscriptions, numbers, chat

# Import services
from app.services.subscription_service import check_subscriptions
from app.utils.date_utils import get_current_datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create database tables
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created successfully")
    
    # Start background tasks (subscription checks, etc.)
    # Note: In production, we would use a proper task scheduler like Celery or APScheduler
    # For now, we'll implement a simple background task pattern
    
    yield
    # Cleanup on shutdown
    logger.info("Application shutting down")

# Create FastAPI application
app = FastAPI(
    title="OwnBot API",
    description="Comprehensive AI-powered chatbot management platform",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to your frontend domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(clients.router, prefix="/api/clients", tags=["clients"])
app.include_router(documents.router, prefix="/api/documents", tags=["documents"])
app.include_router(subscriptions.router, prefix="/api/subscriptions", tags=["subscriptions"])
app.include_router(numbers.router, prefix="/api/numbers", tags=["numbers"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])

# Mount static files for web chat widget
app.mount("/static", StaticFiles(directory="app/static"), name="static")

# Health check endpoint
@app.get("/")
async def root():
    return {
        "message": "OwnBot API is running",
        "status": "success",
        "timestamp": get_current_datetime(),
        "version": "1.0.0"
    }

# Health check endpoint
@app.get("/health")
async def health_check():
    try:
        # Test database connection
        db = SessionLocal()
        db.execute("SELECT 1")
        db.close()
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "status": "healthy",
                "database": "connected",
                "timestamp": get_current_datetime()
            }
        )
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Service unavailable"
        )

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {str(exc)}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"message": "Internal server error", "detail": str(exc)}
    )

# Subscription check endpoint (for manual triggering)
@app.post("/api/admin/check-subscriptions")
async def manual_subscription_check():
    try:
        result = check_subscriptions()
        return {
            "message": "Subscription check completed",
            "expired_count": result.get("expired_count", 0),
            "warned_count": result.get("warned_count", 0)
        }
    except Exception as e:
        logger.error(f"Subscription check failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Subscription check failed: {str(e)}"
        )

# Application information endpoint
@app.get("/api/info")
async def app_info():
    return {
        "app_name": "OwnBot",
        "version": "1.0.0",
        "description": "AI-powered chatbot management platform",
        "features": [
            "Multi-tenant client management",
            "PDF-based knowledge system",
            "WhatsApp, Voice, and Web chat integration",
            "Subscription-based billing",
            "Twilio phone number management"
        ],
        "supported_channels": ["whatsapp", "voice", "web"],
        "supported_business_types": ["restaurant", "gym", "clinic", "retail", "other"]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
