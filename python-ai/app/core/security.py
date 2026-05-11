"""
Security utilities for API authentication and request validation
"""
import os
import hmac
import hashlib
import time
from typing import Optional
from fastapi import Header, HTTPException, Request
from fastapi.security import APIKeyHeader
from app.core.config import settings
from app.core.logging import logger

# API Key header scheme
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


async def verify_api_key(x_api_key: Optional[str] = Header(None)) -> str:
    """
    Verify API key from request header
    
    Args:
        x_api_key: API key from X-API-Key header
        
    Returns:
        str: Validated API key
        
    Raises:
        HTTPException: If API key is missing or invalid
    """
    expected_key = os.getenv("API_KEY")
    
    if not expected_key:
        logger.error("API_KEY not configured in environment")
        raise HTTPException(
            status_code=500,
            detail="API key authentication not configured"
        )
    
    if not x_api_key:
        logger.warning("Missing API key in request")
        raise HTTPException(
            status_code=401,
            detail="API key required"
        )
    
    # Use constant-time comparison to prevent timing attacks
    if not hmac.compare_digest(x_api_key, expected_key):
        logger.warning("Invalid API key provided")
        raise HTTPException(
            status_code=401,
            detail="Invalid API key"
        )
    
    return x_api_key


async def verify_request_signature(
    request: Request,
    x_signature: Optional[str] = Header(None),
    x_timestamp: Optional[str] = Header(None)
) -> bool:
    """
    Verify request signature for inter-service communication
    
    Args:
        request: FastAPI request object
        x_signature: Request signature from header
        x_timestamp: Request timestamp from header
        
    Returns:
        bool: True if signature is valid
        
    Raises:
        HTTPException: If signature is missing or invalid
    """
    secret = os.getenv("INTER_SERVICE_SECRET")
    
    if not secret:
        logger.error("INTER_SERVICE_SECRET not configured in environment")
        raise HTTPException(
            status_code=500,
            detail="Request signing not configured"
        )
    
    if not x_signature or not x_timestamp:
        logger.warning("Missing signature or timestamp in request")
        raise HTTPException(
            status_code=401,
            detail="Request signature required"
        )
    
    # Check timestamp to prevent replay attacks (5 minute window)
    try:
        request_time = int(x_timestamp)
        current_time = int(time.time() * 1000)
        time_diff = abs(current_time - request_time)
        max_time_diff = 5 * 60 * 1000  # 5 minutes
        
        if time_diff > max_time_diff:
            logger.warning(f"Request timestamp too old: {time_diff}ms")
            raise HTTPException(
                status_code=401,
                detail="Request timestamp expired"
            )
    except ValueError:
        logger.warning("Invalid timestamp format")
        raise HTTPException(
            status_code=401,
            detail="Invalid timestamp"
        )
    
    # Get request body
    body = await request.body()
    body_str = body.decode('utf-8') if body else ''
    
    # Compute expected signature
    payload = f"{x_timestamp}.{request.method}.{request.url.path}.{body_str}"
    expected_signature = hmac.new(
        secret.encode('utf-8'),
        payload.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    
    # Use constant-time comparison
    if not hmac.compare_digest(x_signature, expected_signature):
        logger.warning("Invalid request signature")
        raise HTTPException(
            status_code=401,
            detail="Invalid request signature"
        )
    
    return True


def create_request_signature(method: str, path: str, body: str = "") -> dict:
    """
    Create request signature for outgoing requests
    
    Args:
        method: HTTP method
        path: Request path
        body: Request body (stringified)
        
    Returns:
        dict: Headers with signature and timestamp
    """
    secret = os.getenv("INTER_SERVICE_SECRET")
    
    if not secret:
        raise ValueError("INTER_SERVICE_SECRET not configured")
    
    timestamp = str(int(time.time() * 1000))
    payload = f"{timestamp}.{method}.{path}.{body}"
    signature = hmac.new(
        secret.encode('utf-8'),
        payload.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    
    return {
        "X-Signature": signature,
        "X-Timestamp": timestamp
    }


def validate_ip_whitelist(client_ip: str) -> bool:
    """
    Validate client IP against whitelist
    
    Args:
        client_ip: Client IP address
        
    Returns:
        bool: True if IP is whitelisted or whitelist is disabled
    """
    whitelist = os.getenv("IP_WHITELIST", "")
    
    if not whitelist:
        # Whitelist disabled
        return True
    
    allowed_ips = [ip.strip() for ip in whitelist.split(",")]
    return client_ip in allowed_ips


async def check_ip_whitelist(request: Request):
    """
    Middleware to check IP whitelist
    
    Args:
        request: FastAPI request object
        
    Raises:
        HTTPException: If IP is not whitelisted
    """
    client_ip = request.client.host
    
    if not validate_ip_whitelist(client_ip):
        logger.warning(f"Request from non-whitelisted IP: {client_ip}")
        raise HTTPException(
            status_code=403,
            detail="Access denied"
        )
