from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from typing import Dict, List
import jwt
from app.api.auth import SECRET_KEY, ALGORITHM

router = APIRouter(tags=["Вебсокеты"])

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, match_id: int):
        await websocket.accept()
        if match_id not in self.active_connections:
            self.active_connections[match_id] = []
        self.active_connections[match_id].append(websocket)

    def disconnect(self, websocket: WebSocket, match_id: int):
        if match_id in self.active_connections:
            self.active_connections[match_id].remove(websocket)
            if not self.active_connections[match_id]:
                del self.active_connections[match_id]

    async def broadcast_to_match(self, match_id: int, message: dict):
        """Отправляет JSON всем участникам конкретного матча"""
        if match_id in self.active_connections:
            for connection in self.active_connections[match_id]:
                await connection.send_json(message)

manager = ConnectionManager()

@router.websocket("/ws/match/{match_id}")
async def match_websocket(
    websocket: WebSocket,
    match_id: int,
    token: str = Query(...)
):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            await websocket.close(code=1008)
            return
    except Exception:
        await websocket.close(code=1008)
        return


    await manager.connect(websocket, match_id)
    
    try:
        while True:
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, match_id)