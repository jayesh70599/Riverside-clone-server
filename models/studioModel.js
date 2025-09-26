// /server/models/studioModel.js

import mongoose from 'mongoose';

const studioSchema = mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    host: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User', // Establishes a relationship with the User model
    },
    // A short, unique, shareable ID for the studio room
    uniqueRoomId: {
      type: String,
      required: true,
      unique: true,
    },
  },
  {
    timestamps: true,
  }
);

const Studio = mongoose.model('Studio', studioSchema);

export default Studio;