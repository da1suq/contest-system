from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import secrets

from app.database import get_db
from app.models import Lobby, Match, User 
from app.api.auth import get_current_user 

router = APIRouter(prefix="/lobby", tags=["Lobby"])

@router.post("/create")
def create_lobby(contest_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    existing_lobby = db.query(Lobby).filter(
        Lobby.creator_id == current_user.id, 
        Lobby.status == "waiting"
    ).first()
    
    if existing_lobby:
        raise HTTPException(status_code=400, detail="У вас уже есть активное лобби")

    token = secrets.token_urlsafe(16)
    
    new_lobby = Lobby(
        contest_id=contest_id,
        creator_id=current_user.id,
        mode="duel",
        invitation_token=token,
        status="waiting"
    )
    
    db.add(new_lobby)
    db.commit()
    db.refresh(new_lobby)
    
    return new_lobby


@router.post("/join/{token}")
def join_lobby(token: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):

    lobby = db.query(Lobby).with_for_update().filter(Lobby.invitation_token == token).first()
    
    if not lobby:
        raise HTTPException(status_code=404, detail="Лобби не найдено")
    
    if lobby.status != "waiting":
        raise HTTPException(status_code=400, detail="Лобби уже заполнено или отменено")
        
    if lobby.creator_id == current_user.id:
        raise HTTPException(status_code=400, detail="Нельзя принять собственное приглашение")

    
    lobby.status = "active"
    
    
    new_match = Match(
        lobby_id=lobby.id,
        contest_id=lobby.contest_id,
        mode="duel",
        status="waiting" 
    )
    
    db.add(new_match)
    db.flush() 
    db.commit()
    
    return {"message": "Успешно присоединились", "match_id": new_match.id}