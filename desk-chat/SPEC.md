# Desk Chat — Browser-Based Floor Session Messenger

## Overview

A lightweight, browser-based chat app that lets legislators and staff communicate silently during floor session. It runs on a local network (or over the internet with a simple room code), requires no install, and works on any device with a browser — laptop, tablet, or phone tucked under the desk.

## Design Principles

- **Zero friction**: No accounts, no install. Open a link, pick a display name, join a room.
- **Ephemeral by default**: Messages live in memory only. When the session ends, the conversation disappears. No FOIA-able server logs.
- **Discreet**: Minimal UI. No sounds, no flashing. Looks like a plain notes app at a glance.
- **Simple to deploy**: A single command starts the server. Anyone on the network can connect.

## Tech Stack

- **Backend**: Python (FastAPI + WebSockets) — keeps it in the same language as the existing repo
- **Frontend**: Vanilla HTML/CSS/JS — no build step, no node_modules
- **Transport**: WebSockets for real-time messaging
- **State**: In-memory only (no database)

---

## Milestone 1 — Group Chat Room (MVP)

**Goal**: A working chat room that multiple people can join and talk in.

### Features
- Server starts with a single command (`python server.py`)
- Landing page: enter a display name and room code, click "Join"
- Single chat room per room code (room created on first join)
- Real-time message delivery via WebSockets
- Messages display with sender name and timestamp
- Member list sidebar showing who's in the room
- Join/leave notifications
- Clean, minimal dark-mode UI that won't attract attention on the floor

### Deliverables
- `desk-chat/server.py` — FastAPI app with WebSocket endpoints
- `desk-chat/static/index.html` — Landing/join page
- `desk-chat/static/chat.html` — Chat room UI
- `desk-chat/static/style.css` — Styling
- `desk-chat/static/app.js` — Client-side WebSocket logic

---

## Milestone 2 — Direct Messages & Polish

**Goal**: Add private side-conversations and quality-of-life features.

### Features
- Click a name in the member list to open a direct message thread
- DM tabs/panels alongside the main room chat
- Unread message indicators (subtle dot, no sound)
- "Quiet mode" toggle — hides all message previews, shows only a count badge (for when someone is looking over your shoulder)
- Typing indicators (optional, off by default)
- Reconnection handling — if the WebSocket drops, auto-reconnect and rejoin
- Linkify URLs in messages
- Shift+Enter for multi-line messages, Enter to send

### Deliverables
- Updated `server.py` with DM routing
- Updated `app.js` with DM UI, tabs, and reconnection logic
- Updated `style.css` with DM and quiet-mode styling

---

## Milestone 3 — Reactions, Votes & Session Tools

**Goal**: Add features specifically useful for floor session coordination.

### Features
- **Quick reactions**: Tap to react to a message with a small set of emoji (👍 👎 ❓ 😂) — good for silent straw polls
- **Inline poll / whip count**: Any member can post a quick yes/no/undecided poll (e.g., "Are we voting yes on HB 1234?"). Results update live and are visible to the room.
- **Pin message**: Pin an important message to the top of the chat (e.g., "Amendment 3 is up next — vote NO")
- **Room lock**: Room creator can lock the room so no new members can join mid-session
- **Export chat**: Download the conversation as a plain text file before closing (opt-in, for personal reference only)
- **Mobile-responsive layout**: Optimized for phone screens held under a desk

### Deliverables
- Updated `server.py` with poll, reaction, pin, and lock endpoints
- Updated frontend with poll creation UI, reaction picker, pinned message bar
- Mobile-responsive CSS adjustments
- `desk-chat/README.md` with setup and usage instructions

---

## Running the App (Target UX)

```bash
# Install dependencies (one time)
pip install fastapi uvicorn websockets

# Start the server
cd desk-chat
python server.py

# Share the URL with your seatmates
# → http://localhost:8000 (or your local IP)
```

## Out of Scope (for now)

- End-to-end encryption (would add complexity; could be a future milestone)
- Persistent message history / database
- User authentication beyond display names
- File/image sharing
- Push notifications
