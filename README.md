# EchoX - Private by Default

EchoX is a completely ephemeral, memory-only, real-time anonymous chat application.

## Core Principles
1. **Zero Persistence**: No database, no file system writes. State lives exclusively in server RAM.
2. **True Ephemerality**: If the last person leaves a room, or the server restarts, everything is permanently wiped.
3. **No Auth Footprint**: Sessions are tracked client-side via `sessionStorage`. There are no JWTs or cookies.
4. **Anonymity**: Users are assigned random anonymous codenames (e.g. "Silent Fox 39") purely on the client side.

## Features
- Create single-use ("One-time") or standard ("Reusable") encrypted rooms.
- Shareable auto-formatted invite text.
- Anonymous messaging via WebSockets (Socket.io).
- Dark-mode responsive "Digital Vault" UI strictly following the Stitch aesthetic rules.

## Tech Stack
- Frontend: HTML5, CSS3 Variables, Vanilla JS
- Backend: `express` (static serving, API), `socket.io` (real-time events)
- Security: `bcrypt` (password hashing)

## Get Started

```bash
npm install
npm start
```

Visit `http://localhost:3000` to begin.

## Deployment
This project is configured for seamless deployment on Render using the provided `render.yaml`.
