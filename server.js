const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const bcrypt = require('bcrypt');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-memory storage for rooms
// rooms[roomCode] = { passwordHash, passwordType, passwordUsedCount, createdAt, clients: new Set() }
const rooms = {};

// Create room endpoint
app.post('/api/rooms/create', async (req, res) => {
  const { roomCode, password, passwordType } = req.body;

  if (!roomCode || !password) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  if (rooms[roomCode]) {
    return res.status(409).json({ error: "Room code already taken." });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    rooms[roomCode] = {
      passwordHash,
      passwordType: passwordType || 'reusable',
      passwordUsedCount: 0,
      createdAt: Date.now(),
      clients: new Set()
    };
    return res.status(200).json({ success: true, roomCode });
  } catch (error) {
    console.error("Error creating room:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
});

// Join room endpoint
app.post('/api/rooms/join', async (req, res) => {
  const { roomCode, password } = req.body;

  const room = rooms[roomCode];
  if (!room) {
    return res.status(404).json({ error: "This room no longer exists or has already been closed." });
  }

  const isMatch = await bcrypt.compare(password, room.passwordHash);
  if (!isMatch) {
    return res.status(401).json({ error: "Invalid room code or password." });
  }

  if (room.passwordType === 'one-time' && room.passwordUsedCount >= 1) {
    return res.status(403).json({ error: "This invite link has already been used." });
  }

  room.passwordUsedCount += 1;
  return res.status(200).json({ success: true, roomCode });
});

// Handle socket connections
io.on('connection', (socket) => {
  
  socket.on('join-room', ({ roomCode, anonName }) => {
    const room = rooms[roomCode];
    if (!room) return;

    socket.join(roomCode);
    room.clients.add(socket.id);
    
    // Store reference to room on socket for disconnect logic
    socket.roomCode = roomCode;

    io.to(roomCode).emit('user-count', { count: room.clients.size });
    socket.broadcast.to(roomCode).emit('message', {
      text: "A user joined.",
      type: 'system',
      timestamp: new Date().toISOString()
    });
  });

  socket.on('send-message', ({ roomCode, text, anonName, timestamp }) => {
    const room = rooms[roomCode];
    if (!room) return;

    socket.broadcast.to(roomCode).emit('message', {
      text,
      anonName,
      timestamp,
      type: 'user'
    });
  });

  socket.on('disconnect', () => {
    const roomCode = socket.roomCode;
    if (!roomCode) return;

    const room = rooms[roomCode];
    if (!room) return;

    room.clients.delete(socket.id);

    if (room.clients.size === 0) {
      // Room empty, delete it completely
      delete rooms[roomCode];
      console.log(`Room ${roomCode} deleted.`);
    } else {
      // Room still active, inform others
      io.to(roomCode).emit('user-count', { count: room.clients.size });
      io.to(roomCode).emit('message', {
        text: "A user left.",
        type: 'system',
        timestamp: new Date().toISOString()
      });
    }
  });
});

// Handle undefined routes
app.get('/room/:roomCode', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'room.html'));
});

app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
