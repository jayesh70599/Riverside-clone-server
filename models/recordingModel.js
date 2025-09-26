import mongoose from 'mongoose';

const recordingSchema = mongoose.Schema(
  {
    // A reference to the Studio this recording belongs to
    studio: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Studio',
    },
    // A reference to the User who created this specific recording
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    // The unique filename/key of the recording in the S3 bucket
    filePath: {
      type: String,
      required: true,
    },
    // The type of media (e.g., 'audio' or 'video')
    mediaType: { 
      type: String, 
      required: true,
      default: 'video', // Default to 'video' for now
    },
    startTime: { 
      type: Date 
    },
    // Time this specific user's recording ended
    endTime: { 
      type: Date 
    },
    // To track active, in-progress recordings
    isActive: { 
      type: Boolean, 
      default: false 
    },
    session: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Session',
    },
    uploadStatus: {
    type: String,
    enum: ['pending', 'complete'],
    default: 'pending'
    }
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields
  }
);

const Recording = mongoose.model('Recording', recordingSchema);

export default Recording;