const { createServer } = require('http');
const { Server } = require('socket.io');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 9002;

// Important: Tell Next.js to use turbopack in dev mode
const app = next({ 
  dev, 
  hostname, 
  port,
  turbo: dev
});
const handler = app.getRequestHandler();

const rooms = new Map(); // Store room state

app.prepare().then(() => {
  const httpServer = createServer(handler);
  
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Debug: Log all incoming events
    socket.onAny((eventName, ...args) => {
      console.log(`[Event Received] ${eventName} from ${socket.id}`);
    });

    console.log('Registering event handlers for socket:', socket.id);

    // Join a party room
    socket.on('join-party', ({ partyId, username }) => {
      socket.join(partyId);
      socket.data.partyId = partyId;
      socket.data.username = username || `User-${socket.id.slice(0, 4)}`;

      // Initialize room if it doesn't exist
      if (!rooms.has(partyId)) {
        rooms.set(partyId, {
          videoId: '',
          isPlaying: false,
          currentTime: 0,
          hostId: socket.id, // First user becomes host
          users: []
        });
      }

      const room = rooms.get(partyId);
      const isHost = room.hostId === socket.id;
      
      room.users.push({
        id: socket.id,
        username: socket.data.username,
        isHost: isHost
      });

      // Send current room state to the new user
      socket.emit('room-state', {
        videoId: room.videoId,
        isPlaying: room.isPlaying,
        currentTime: room.currentTime,
        hostId: room.hostId,
        users: room.users
      });

      // Notify others in the room
      socket.to(partyId).emit('user-joined', {
        userId: socket.id,
        username: socket.data.username,
        users: room.users
      });

      console.log(`${socket.data.username} joined party: ${partyId} (Host: ${isHost})`);
    });

    // Change video
    socket.on('change-video', ({ partyId, videoId }) => {
      const room = rooms.get(partyId);
      if (room) {
        room.videoId = videoId;
        room.isPlaying = false;
        room.currentTime = 0;
        
        // Broadcast to all in room including sender
        io.to(partyId).emit('video-changed', { videoId });
        console.log(`Video changed in ${partyId} to ${videoId}`);
      }
    });

    // Sync play
    socket.on('sync-play', ({ partyId, targetTime }) => {
      const room = rooms.get(partyId);
      if (room) {
        room.isPlaying = true;
        
        // Broadcast to all in room
        io.to(partyId).emit('play-synced', { targetTime });
        console.log(`Sync play in ${partyId} at ${new Date(targetTime).toISOString()}`);
      }
    });

    // Pause
    socket.on('pause', ({ partyId, currentTime }) => {
      const room = rooms.get(partyId);
      if (room) {
        room.isPlaying = false;
        room.currentTime = currentTime;
        
        // Broadcast to all in room
        io.to(partyId).emit('paused', { currentTime });
        console.log(`Paused in ${partyId} at ${currentTime}s`);
      }
    });

    // Seek video
    socket.on('seek', ({ partyId, currentTime }) => {
      const room = rooms.get(partyId);
      if (room) {
        room.currentTime = currentTime;
        
        // Broadcast to others in room
        socket.to(partyId).emit('seeked', { currentTime });
        console.log(`Seeked in ${partyId} to ${currentTime}s`);
      }
    });

    // Sync everyone to a specific time
    socket.on('sync-to-time', ({ partyId, currentTime, shouldPlay }) => {
      console.log('=== SYNC-TO-TIME EVENT RECEIVED ===');
      console.log(`From: ${socket.id}`);
      console.log(`Party: ${partyId}`);
      console.log(`Time: ${currentTime}s`);
      console.log(`Should Play: ${shouldPlay}`);
      
      const room = rooms.get(partyId);
      if (room) {
        room.currentTime = currentTime;
        room.isPlaying = shouldPlay;
        
        // Broadcast to all in room (including sender)
        io.to(partyId).emit('synced-to-time', { 
          currentTime,
          shouldPlay
        });
        
        console.log(`✓ Synced all users in ${partyId} to ${currentTime}s (playing: ${shouldPlay})`);
      } else {
        console.log(`✗ Room ${partyId} not found for sync`);
      }
    });
    
    console.log('All event handlers registered for socket:', socket.id);

    // Handle disconnect
    socket.on('disconnect', () => {
      const partyId = socket.data.partyId;
      if (partyId && rooms.has(partyId)) {
        const room = rooms.get(partyId);
        room.users = room.users.filter(u => u.id !== socket.id);
        
        // Notify others
        socket.to(partyId).emit('user-left', {
          userId: socket.id,
          username: socket.data.username,
          users: room.users
        });

        // Clean up empty rooms
        if (room.users.length === 0) {
          rooms.delete(partyId);
          console.log(`Room ${partyId} deleted (empty)`);
        }
      }
      console.log('User disconnected:', socket.id);
    });
  });

  httpServer
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
      console.log(`> Socket.IO server running`);
    });
});
