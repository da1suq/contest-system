import jwt 
from datetime import datetime, timedelta, timezone
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jwt.exceptions import InvalidTokenError

SECRET_KEY = "super_secret_hackathon_key_must_be_at_least_32_bytes_long_12345"
ALGORITHM = "HS256"

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from passlib.context import CryptContext

from app.schemas.models import RegisterParticipant, LoginRequest
from app.database import get_db
from app.models import User

router = APIRouter(tags=["Авторизация и Пользователи"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password[:72])

@router.post("/auth/register/participant")
def register_participant(user_data: RegisterParticipant, db: Session = Depends(get_db)):
    
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email уже занят")

    hashed_password = get_password_hash(user_data.password)

    new_user = User(
        email=user_data.email,
        password_hash=hashed_password,
        role="participant"
    )

    db.add(new_user)       
    db.commit()            
    db.refresh(new_user)   

    return {"id": new_user.id, "email": new_user.email, "role": new_user.role}


@router.post("/auth/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):

    user = db.query(User).filter(User.email == form_data.username).first()
    
    if not user:
        raise HTTPException(status_code=400, detail="Неверный email или пароль")

    if not pwd_context.verify(form_data.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Неверный email или пароль")

    expiration = datetime.now(timezone.utc) + timedelta(hours=24)
    token_payload = {
        "sub": str(user.id),
        "role": user.role,
        "exp": expiration
    }

    token = jwt.encode(token_payload, SECRET_KEY, algorithm=ALGORITHM)

    return {"access_token": token, "token_type": "bearer"}

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise credentials_exception
            
        user = db.query(User).filter(User.id == int(user_id)).first()
        
        if user is None:
            raise credentials_exception
        return user
    except Exception:
        raise credentials_exception