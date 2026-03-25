#!/usr/bin/env python3
"""Cap Chat — lightweight floor session messenger."""

from datetime import datetime
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import json
import uvicorn

app = FastAPI()

# room_code -> {ws: display_name}
rooms: dict[str, dict[WebSocket, str]] = {}


async def broadcast(room_code: str, message: dict):
    """Send a JSON message to every connection in a room."""
    room = rooms.get(room_code, {})
    dead = []
    payload = json.dumps(message)
    for ws in room:
        try:
            await ws.send_text(payload)
        except Exception:
            dead.append(ws)
    for ws in dead:
        room.pop(ws, None)


async def send_to_user(room_code: str, target_name: str, message: dict):
    """Send a JSON message to a specific user in a room."""
    room = rooms.get(room_code, {})
    payload = json.dumps(message)
    for ws, name in room.items():
        if name == target_name:
            try:
                await ws.send_text(payload)
            except Exception:
                pass


def timestamp() -> str:
    return datetime.now().strftime("%H:%M")


def member_list(room_code: str) -> list[str]:
    return list(rooms.get(room_code, {}).values())


@app.websocket("/ws/{room_code}")
async def websocket_endpoint(ws: WebSocket, room_code: str, name: str = Query("")):
    if not name.strip():
        await ws.close(code=4000, reason="Display name required")
        return

    name = name.strip()
    await ws.accept()

    # Join room
    if room_code not in rooms:
        rooms[room_code] = {}
    rooms[room_code][ws] = name

    # Notify room
    await broadcast(room_code, {
        "type": "system",
        "text": f"{name} joined the room",
        "timestamp": timestamp(),
    })
    await broadcast(room_code, {
        "type": "members",
        "members": member_list(room_code),
    })

    try:
        while True:
            data = await ws.receive_text()
            try:
                msg = json.loads(data)
            except json.JSONDecodeError:
                continue

            msg_type = msg.get("type")

            if msg_type == "message" and msg.get("text", "").strip():
                await broadcast(room_code, {
                    "type": "message",
                    "sender": name,
                    "text": msg["text"].strip(),
                    "timestamp": timestamp(),
                })

            elif msg_type == "dm":
                recipient = msg.get("recipient", "")
                text = msg.get("text", "").strip()
                if recipient and text and recipient in member_list(room_code):
                    dm_payload = {
                        "type": "dm",
                        "sender": name,
                        "recipient": recipient,
                        "text": text,
                        "timestamp": timestamp(),
                    }
                    await send_to_user(room_code, recipient, dm_payload)
                    # Echo back to sender so they see their own message
                    await send_to_user(room_code, name, dm_payload)

            elif msg_type == "typing":
                channel = msg.get("channel", "room")
                if channel == "room":
                    await broadcast(room_code, {
                        "type": "typing",
                        "sender": name,
                        "channel": "room",
                    })
                else:
                    # DM typing — only send to the other person
                    await send_to_user(room_code, channel, {
                        "type": "typing",
                        "sender": name,
                        "channel": name,
                    })
    except WebSocketDisconnect:
        pass
    finally:
        # Leave room
        rooms.get(room_code, {}).pop(ws, None)

        if rooms.get(room_code):
            await broadcast(room_code, {
                "type": "system",
                "text": f"{name} left the room",
                "timestamp": timestamp(),
            })
            await broadcast(room_code, {
                "type": "members",
                "members": member_list(room_code),
            })
        else:
            rooms.pop(room_code, None)


# Static files & pages
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/")
async def index():
    return FileResponse("static/index.html")


@app.get("/chat")
async def chat():
    return FileResponse("static/chat.html")


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
