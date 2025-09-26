// /server/models/sessionModel.js
import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
  studio: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Studio',
  },
  host: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  combinedVideoPath: {
    type: String, // e.g., "combined-videos/sessionId.mp4"
  }
}, {
  timestamps: true, // createdAt will be the session's start time
});

const Session = mongoose.model('Session', sessionSchema);

export default Session;