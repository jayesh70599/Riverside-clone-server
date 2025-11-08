import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import { PeerServer } from 'peer';

import Recording from './models/recordingModel.js';
import Studio from './models/studioModel.js';
import Session from './models/sessionModel.js';

import connectDB from './config/db.js';
import userRoutes from './routes/userRoutes.js';
import studioRoutes from './routes/studioRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import recordingRoutes from './routes/recordingRoutes.js';
import sessionRoutes from './routes/sessionRoutes.js';

import axios from 'axios'

// Load environment variables and connect to the database
//dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);

// Configure CORS for Socket.IO and Express
// const corsOptions = {
//   origin: "http://localhost:5173", // URL of your React app
//   methods: ["GET", "POST"]
// };

// // Initialize Socket.IO Server
// const io = new SocketIOServer(server, {
//   cors: corsOptions
// });

const corsOptions =  {
    origin: process.env.CLIENT_URL, 
    methods: ["GET", "POST"]
}

const io = new SocketIOServer(server, {
  cors: corsOptions
});

// Initialize Express Middleware
app.use(cors(corsOptions));
app.use(express.json());

// API Routes
app.get('/', (req, res) => {
  res.send('API Server is running!');
});

app.use('/api/users', userRoutes);
app.use('/api/studios', studioRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/recordings', recordingRoutes);
app.use('/api/sessions', sessionRoutes);

const recordingStates = {};

// Socket.IO Logic for Room Management

// A new helper function to check if the session is ready
const checkAndTriggerWorker = async (sessionId) => {
    const sessionRecordings = await Recording.find({ session: sessionId });
    const completedRecordings = sessionRecordings.filter(r => r.uploadStatus === 'complete');
    
    // Check if all recordings for the session are complete
    if (sessionRecordings.length > 0 && sessionRecordings.length === completedRecordings.length) {
        console.log(`All ${sessionRecordings.length} recordings for session ${sessionId} are complete. Triggering worker.`);
        try {
            await axios.post('http://localhost:5001/create-combined-video', { sessionId });
        } catch (error) {
            console.error('Error triggering worker service:', error.message);
        }
    }
};

io.on('connection', (socket) => {
  let peerId;

  socket.on('join-room', (roomId, pId, userId) => {
    peerId = pId;
    socket.join(roomId);
    socket.roomId = roomId;
    socket.userId = userId;

    if (recordingStates[roomId]) {
      setTimeout(() => {
        socket.emit('start-all-recorders');
        socket.emit('session-started', { sessionId : recordingStates[roomId] })
      }, 1000)
    }
    socket.to(roomId).emit('user-connected', peerId);
  });

  socket.on('recording-started', async (payload) => {
    const { userId, roomId, s3FileKey } = payload;
    const sessionId = recordingStates[roomId];
    if (sessionId) {
      try {
        const studio = await Studio.findOne({ uniqueRoomId: roomId });
        if (studio) {
          // 3. Create the recording and link it to the session
          const newRecording = await Recording.create({
            studio: studio._id,
            user: userId,
            filePath: s3FileKey,
            session: sessionId, // Link to the parent session
            startTime: new Date(),
            isActive: true,
          });
          socket.recordingId = newRecording._id;
           socket.emit('db-recording-created', { recordingId: newRecording._id });
        }
       // socket.emit('db-recording-created', { recordingId: newRecording._id });
      } catch (error) {
        console.error('Error creating recording document:', error);
      }
    }
  });

  socket.on('disconnect', async () => {
    if (socket.recordingId) {
      try {
        await Recording.findByIdAndUpdate(socket.recordingId, {
          endTime: new Date(),
          isActive: false,
        });
        console.log(`Recording ${socket.recordingId} marked as finished.`);
      } catch (error) {
        console.error('Error updating recording on disconnect:', error);
      }
    }
    if (socket.roomId && peerId) {
      socket.to(socket.roomId).emit('user-disconnected', peerId);
    }
  });

  socket.on('host-start-recording', async (roomId, hostId) => {
    
     try {
      const studio = await Studio.findOne({ uniqueRoomId: roomId });
      if (studio) {
        // 1. Create a new session document
        const newSession = await Session.create({
          studio: studio._id,
          host: hostId,
        });

        // 2. Broadcast the TRUE session ID to all clients
        io.to(roomId).emit('session-started', { sessionId: newSession._id });
        
        // 2. Store the new session ID in our recording state
        recordingStates[roomId] = newSession._id;
        //socket.broadcast.to(roomId).emit('start-all-recorders');
        io.to(roomId).emit('start-all-recorders');
      }
    } catch (error) {
      console.error('Error starting session:', error);
    }

  });

  socket.on('host-stop-recording', async (roomId) => {
    const sessionId = recordingStates[roomId];
    if (sessionId) {
      // 4. Mark the session as inactive
      await Session.findByIdAndUpdate(sessionId, { isActive: false });
    }
    delete recordingStates[roomId];
    //socket.broadcast.to(roomId).emit('stop-all-recorders');
    io.to(roomId).emit('stop-all-recorders');
    try {
      const studio = await Studio.findOne({ uniqueRoomId: roomId });
      if (studio) {
        await Recording.updateMany(
          { studio: studio._id, isActive: true },
          { $set: { endTime: new Date(), isActive: false } }
        );
      }
    } catch (error) {
      console.error('Error stopping active recordings:', error);
    }
  });

  // socket.on('upload-complete', async (data) => {
  //   const { recordingId, sessionId } = data;
  //   if (recordingId) {
  //     await Recording.findByIdAndUpdate(recordingId, { uploadStatus: 'complete' });
  //     console.log(`Marked recording ${recordingId} as complete.`);
      
  //     // Now, check if the whole session is ready
  //     if (sessionId) {
  //       await checkAndTriggerWorker(sessionId);
  //     }
  //   }
  // });
});

// Start the main HTTP/Socket.IO server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 API Server is listening on port ${PORT}`));

// Start the PeerJS Server on a separate port
// const peerServer = PeerServer({
//   port: 9000,
//   path: '/myapp'
// });

peerServer.on('connection', (client) => {
  console.log(`PeerJS client connected: ${client.getId()}`);
});

peerServer.on('disconnect', (client) => {
  console.log(`PeerJS client disconnected: ${client.getId()}`);
});

console.log('PeerJS server is running on port 9000');