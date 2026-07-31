#!/usr/bin/env python3
"""
TeacherFolio Signaling Server
==============================
Pure WebRTC signaling server for peer-to-peer audio/video calls.
No AI models — just relays WebRTC handshake messages between peers.

Usage:
  python server.py
"""

import asyncio
import json
import logging
import uuid

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("signaling")

HOST = "127.0.0.1"
PORT = 8765

app = FastAPI(title="TeacherFolio Signaling", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── In-memory room store ──
# room_id -> { teacher_ws, visitor_ws }
rooms: dict[str, dict] = {}

# ── Health ──

@app.get("/health")
async def health():
    return {"status": "ok", "service": "teacherfolio-signaling", "rooms": len(rooms)}

@app.get("/rooms")
async def list_rooms():
    """Show active rooms (for debugging)."""
    return {
        "active_rooms": [
            {"id": rid, "teacher": r.get("teacher") is not None, "visitor": r.get("visitor") is not None}
            for rid, r in rooms.items()
        ]
    }

# ── WebSocket signaling ──

@app.websocket("/ws/signal")
async def websocket_signal(ws: WebSocket):
    await ws.accept()
    logger.info("New WebSocket connection")
    my_room = None
    my_role = None

    try:
        while True:
            raw = await ws.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                await ws.send_json({"type": "error", "message": "Invalid JSON"})
                continue

            msg_type = msg.get("type", "")

            if msg_type == "join":
                # { type: "join", role: "teacher"|"visitor", room?: "room-id" }
                role = msg.get("role", "visitor")
                room_id = msg.get("room")

                if role == "teacher":
                    # Teacher creates or joins a room
                    if not room_id:
                        room_id = str(uuid.uuid4())[:8]
                    rooms[room_id] = rooms.get(room_id, {})
                    rooms[room_id]["teacher"] = ws
                    my_room = room_id
                    my_role = "teacher"
                    await ws.send_json({"type": "joined", "role": "teacher", "room": room_id})
                    logger.info(f"Teacher joined room {room_id}")

                    # If visitor is already waiting, notify teacher
                    if rooms[room_id].get("visitor"):
                        await ws.send_json({"type": "visitor_ready"})

                elif role == "visitor":
                    # Visitor needs a room — can provide one or get a random active one
                    if not room_id:
                        # Find any room with a teacher waiting
                        active = [rid for rid, r in rooms.items() if r.get("teacher") and not r.get("visitor")]
                        if not active:
                            await ws.send_json({"type": "error", "message": "No teacher available"})
                            continue
                        room_id = active[0]

                    if room_id not in rooms or not rooms[room_id].get("teacher"):
                        await ws.send_json({"type": "error", "message": "Room not found or teacher offline"})
                        continue

                    rooms[room_id]["visitor"] = ws
                    my_room = room_id
                    my_role = "visitor"
                    await ws.send_json({"type": "joined", "role": "visitor", "room": room_id})
                    logger.info(f"Visitor joined room {room_id}")

                    # Notify teacher
                    teacher_ws = rooms[room_id].get("teacher")
                    if teacher_ws:
                        try:
                            await teacher_ws.send_json({"type": "incoming_call", "room": room_id})
                        except Exception:
                            pass

            elif msg_type == "ice_candidate":
                # { type: "ice_candidate", candidate: {...}, room: "room-id" }
                target = _get_peer(ws, msg.get("room"))
                if target:
                    await target.send_json({"type": "ice_candidate", candidate: msg.get("candidate")})

            elif msg_type == "offer":
                # { type: "offer", sdp: "...", room: "room-id" }
                target = _get_peer(ws, msg.get("room"))
                if target:
                    await target.send_json({"type": "offer", sdp: msg.get("sdp")})

            elif msg_type == "answer":
                # { type: "answer", sdp: "...", room: "room-id" }
                target = _get_peer(ws, msg.get("room"))
                if target:
                    await target.send_json({"type": "answer", sdp: msg.get("sdp")})

            elif msg_type == "end_call":
                # { type: "end_call", room: "room-id" }
                target = _get_peer(ws, msg.get("room"))
                if target:
                    try:
                        await target.send_json({"type": "peer_disconnected"})
                    except Exception:
                        pass
                _cleanup_room(msg.get("room"))
                my_room = None

            elif msg_type == "text_message":
                # { type: "text_message", text: "...", room: "room-id" }
                target = _get_peer(ws, msg.get("room"))
                if target:
                    await target.send_json({
                        "type": "text_message",
                        "text": msg.get("text", ""),
                        "from": my_role or "unknown",
                    })

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected (role={my_role}, room={my_room})")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        if my_room:
            _cleanup_room(my_room)
        logger.info(f"Connection cleaned up (room={my_room})")


def _get_peer(ws: WebSocket, room_id: str | None) -> WebSocket | None:
    """Get the other peer in the room."""
    if not room_id or room_id not in rooms:
        return None
    room = rooms[room_id]
    if room.get("teacher") == ws:
        return room.get("visitor")
    elif room.get("visitor") == ws:
        return room.get("teacher")
    return None


def _cleanup_room(room_id: str | None):
    """Remove room from memory."""
    if room_id and room_id in rooms:
        del rooms[room_id]
        logger.info(f"Room {room_id} removed")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host=HOST, port=PORT, reload=False, log_level="info")
