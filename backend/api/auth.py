"""
RIA Platform Authentication endpoints with JWT.
Standalone module that works without database for demo purposes.
"""
import os
import logging
from datetime import datetime, timedelta
from typing import Optional, List

from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from jose import jwt, JWTError
from passlib.context import CryptContext

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])
security = HTTPBearer(auto_error=False)

# Configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "edgeai-jwt-secret-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# --- Pydantic Models ---

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    firstName: str
    lastName: str
    role: str  # "user" or "ria"
    firm: Optional[str] = None
    crd: Optional[str] = None
    state: Optional[str] = None
    licenses: Optional[str] = None  # Comma-separated

class UserResponse(BaseModel):
    id: str
    email: str
    firstName: str
    lastName: str
    role: str
    firm: Optional[str] = None
    licenses: Optional[List[str]] = None
    crd: Optional[str] = None
    state: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# --- Mock User Store (Replace with DB in production) ---

USERS_DB: dict = {
    "leslie@iabadvisors.com": {
        "id": "ria-001",
        "email": "leslie@iabadvisors.com",
        "password_hash": pwd_context.hash("CreateWealth2026$"),
        "firstName": "Leslie",
        "lastName": "Wilson",
        "role": "ria",
        "firm": "IAB Advisors, Inc.",
        "licenses": ["Series 6", "Series 7", "Series 63", "Series 65 (pending)"],
        "crd": "7891234",
        "state": "TX",
    }
}

# --- Helper Functions ---

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "iat": datetime.utcnow()})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError as e:
        logger.warning("JWT verification failed: %s", e)
        raise HTTPException(status_code=401, detail="Invalid or expired token")

def get_current_user(token_data: dict = Depends(verify_token)) -> dict:
    email = token_data.get("sub")
    if not email or email not in USERS_DB:
        raise HTTPException(status_code=401, detail="User not found")
    user = USERS_DB[email].copy()
    user.pop("password_hash", None)
    return user

def user_to_response(user: dict) -> UserResponse:
    """Convert user dict to UserResponse model."""
    return UserResponse(
        id=user["id"],
        email=user["email"],
        firstName=user["firstName"],
        lastName=user["lastName"],
        role=user["role"],
        firm=user.get("firm"),
        licenses=user.get("licenses"),
        crd=user.get("crd"),
        state=user.get("state"),
    )

# --- Endpoints ---

@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest):
    """
    Login with email and password.
    Returns JWT access token and user data.
    """
    user = USERS_DB.get(request.email.lower())
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not pwd_context.verify(request.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = create_access_token({"sub": user["email"], "role": user["role"]})
    
    return TokenResponse(
        access_token=token,
        user=user_to_response(user),
    )

@router.post("/signup", response_model=TokenResponse)
async def signup(request: SignupRequest):
    """
    Register a new user account.
    Returns JWT access token and user data.
    """
    email_lower = request.email.lower()
    if email_lower in USERS_DB:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    if len(request.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    
    user_id = f"{request.role}-{int(datetime.utcnow().timestamp())}"
    password_hash = pwd_context.hash(request.password)
    
    # Parse licenses from comma-separated string
    licenses = []
    if request.licenses:
        licenses = [l.strip() for l in request.licenses.split(",") if l.strip()]
    
    new_user = {
        "id": user_id,
        "email": email_lower,
        "password_hash": password_hash,
        "firstName": request.firstName,
        "lastName": request.lastName,
        "role": request.role,
        "firm": request.firm,
        "licenses": licenses,
        "crd": request.crd,
        "state": request.state,
    }
    
    USERS_DB[email_lower] = new_user
    
    token = create_access_token({"sub": new_user["email"], "role": new_user["role"]})
    
    return TokenResponse(
        access_token=token,
        user=user_to_response(new_user),
    )

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """
    Get current authenticated user's profile.
    """
    return user_to_response(current_user)

@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(current_user: dict = Depends(get_current_user)):
    """
    Refresh access token.
    Requires valid existing token.
    """
    token = create_access_token({"sub": current_user["email"], "role": current_user["role"]})
    return TokenResponse(
        access_token=token,
        user=user_to_response(current_user),
    )
