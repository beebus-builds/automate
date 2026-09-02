#!/usr/bin/env python3
"""
TeacherFolio Signaling Server
==============================
Pure WebRTC signaling server for peer-to-peer audio/video calls.
No AI models — just relays WebRTC handshake messages between peers.

Hardening:
  - teacher role requires SIGNALING_TEACHER_TOKEN (fail-closed if unset)
  - browser Origin allow-list (SIGNALING_ALLOWED_ORIGINS)
  - payload size cap, text length cap, per-connection rate limiting
  - strict room id validation

Usage:
  python server.py
"""

import asyncio
import json
import logging
import os
import re
import secrets
import time
import uuid

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("signaling")

HOST = os.getenv("SIGNALING_HOST", "0.0.0.0")
PORT = int(os.getenv("SIGNALING_PORT", "8765"))

# ─── Configuration (fail closed) ────────────────────────────────

# Comma-separated list of allowed browser origins.
ALLOWED_ORIGINS = [
    o.strip()
    for o in os.getenv(
        "SIGNALING_ALLOWED_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000,http://localhost:8000,http://127.0.0.1:8000",
    ).split(",")
    if o.strip()
]

# Shared secret the Next.js app issues to authenticated teachers via /api/signaling-token.
TEACHER_TOKEN = os.getenv("SIGNALING_TEACHER_TOKEN", "")

MAX_MESSAGE_BYTES = 65536      # 64 KB per WebSocket message
MAX_TEXT_LENGTH = 500          # chars for text_message payloads
RATE_MAX = 120                 # messages allowed per...
RATE_WINDOW = 15               # ...seconds, per connection

ROOM_RE = re.compile(r"^[A-Za-z0-9-]{1,16}$")


def origin_allowed(origin: str | None) -> bool:
    """Browser clients send an Origin header — enforce the allowlist.
    Non-browser clients (native/tests) that send no Origin are accepted."""
    if not origin:
        return True
    return origin.strip() in ALLOWED_ORIGINS


def valid_room(room_id: str | None) -> bool:
    return bool(room_id) and ROOM_RE.match(room_id) is not None


def teacher_token_matches(token: str | None) -> bool:
    """Constant-time comparison against the configured teacher token."""
    if not TEACHER_TOKEN:  # config missing → fail closed
        return False
    if not isinstance(token, str) or not token:
        return False
    return secrets.compare_digest(token.encode("utf-8"), TEACHER_TOKEN.encode("utf-8"))


app = FastAPI(title="TeacherFolio Signaling", version="1.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# room_id -> { teacher_ws, visitor_ws }
rooms: dict[str, dict] = {}


# ─── HTTP endpoints ─────────────────────────────────────────────

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


# ─── WebSocket signaling ─────────────────────────────────────────

@app.websocket("/ws/signal")
async def websocket_signal(ws: WebSocket):
    await ws.accept()
    logger.info("New WebSocket connection")

    origin = ws.headers.get("origin")
    if not origin_allowed(origin):
        logger.warning("Rejected connection from disallowed origin: %s", origin)
        await ws.close(code=4403, reason="Origin not allowed")
        return

    my_room = None
    my_role = None
    msg_times: list[float] = []

    def rate_limited() -> bool:
        now = time.monotonic()
        cutoff = now - RATE_WINDOW
        recent = [t for t in msg_times if t > cutoff]
        msg_times.clear()
        msg_times.extend(recent + [now])
        return len(recent) > RATE_MAX

    try:
        while True:
            if rate_limited():
                logger.info("Rate limit exceeded, closing connection")
                await ws.close(code=4408, reason="Rate limit exceeded")
                return

            raw = await ws.receive_text()
            if len(raw) > MAX_MESSAGE_BYTES:
                await ws.send_json({"type": "error", "message": "Message too large"})
                continue
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                await ws.send_json({"type": "error", "message": "Invalid JSON"})
                continue

            msg_type = msg.get("type", "")

            if msg_type == "join":
                # { type: "join", role: "teacher"|"visitor", room?: "room-id", token?: "..." }
                role = msg.get("role", "visitor")
                room_id = msg.get("room")

                if role == "teacher":
                    if not teacher_token_matches(msg.get("token")):
                        await ws.send_json({"type": "error", "message": "Unauthorized"})
                        logger.warning("Teacher join rejected: bad token")
                        continue
                    if room_id is not None and not valid_room(room_id):
                        await ws.send_json({"type": "error", "message": "Invalid room id"})
                        continue
                    # Teacher creates or joins a room
                    if not room_id:
                        room_id = str(uuid.uuid4())[:8]
                    rooms[room_id] = rooms.get(room_id, {})
                    rooms[room_id]["teacher"] = ws
                    my_room = room_id
                    my_role = "teacher"
                    await ws.send_json({"type": "joined", "role": "teacher", "room": room_id})
                    logger.info("Teacher joined room %s", room_id)

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
                    elif not valid_room(room_id):
                        await ws.send_json({"type": "error", "message": "Invalid room id"})
                        continue

                    if room_id not in rooms or not rooms[room_id].get("teacher"):
                        await ws.send_json({"type": "error", "message": "Room not found or teacher offline"})
                        continue

                    rooms[room_id]["visitor"] = ws
                    my_room = room_id
                    my_role = "visitor"
                    await ws.send_json({"type": "joined", "role": "visitor", "room": room_id})
                    logger.info("Visitor joined room %s", room_id)

                    # Notify teacher
                    teacher_ws = rooms[room_id].get("teacher")
                    if teacher_ws:
                        try:
                            await teacher_ws.send_json({"type": "incoming_call", "room": room_id})
                        except Exception:
                            pass

            elif msg_type in ("ice_candidate", "offer", "answer"):
                # { type: ..., candidate/sdp: ..., room: "room-id" }
                target = _get_peer(ws, msg.get("room"))
                if target:
                    payload = {"type": msg_type}
                    payload.update({k: v for k, v in msg.items() if k in ("candidate", "sdp")})
                    await target.send_json(payload)

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
                my_role = None

            elif msg_type == "text_message":
                # { type: "text_message", text: "...", room: "room-id" }
                target = _get_peer(ws, msg.get("room"))
                if target:
                    text = str(msg.get("text", ""))[:MAX_TEXT_LENGTH]
                    await target.send_json({
                        "type": "text_message",
                        "text": text,
                        "from": my_role or "unknown",
                    })

            else:
                await ws.send_json({"type": "error", "message": "Unknown message type"})

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected (role=%s, room=%s)", my_role, my_room)
    except Exception as e:
        logger.error("WebSocket error: %s", e)
    finally:
        if my_room:
            _cleanup_room(my_room)
        logger.info("Connection cleaned up (room=%s)", my_room)


def _get_peer(ws: WebSocket, room_id: str | None) -> WebSocket | None:
    """Get the other peer in the room."""
    if not room_id or not valid_room(room_id) or room_id not in rooms:
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
        logger.info("Room %s removed", room_id)


if __name__ == "__main__":
    if not TEACHER_TOKEN:
        logger.warning(
            "SIGNALING_TEACHER_TOKEN is not set — teacher connections will be rejected "
            "(fail closed). Set it to enable call features."
        )
    import uvicorn
    uvicorn.run("server:app", host=HOST, port=PORT, reload=False, log_level="info")