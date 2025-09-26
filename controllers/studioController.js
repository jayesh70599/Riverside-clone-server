// /server/controllers/studioController.js

import { nanoid } from 'nanoid';
import Studio from '../models/studioModel.js';

// @desc    Create a new studio
// @route   POST /api/studios
export const createStudio = async (req, res) => {
  const { title } = req.body;

  if (!title) {
    return res.status(400).json({ message: 'Title is required' });
  }

  try {
    const studio = await Studio.create({
      title,
      host: req.user._id, // Comes from the 'protect' middleware
      uniqueRoomId: nanoid(10), // Generates a 10-character unique ID
    });
    res.status(201).json(studio);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get studios for a user
// @route   GET /api/studios
export const getStudios = async (req, res) => {
  try {
    const studios = await Studio.find({ host: req.user._id }).sort({
      createdAt: -1,
    });
    res.json(studios);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get studio details by roomId
// @route   GET /api/studios/:roomId/details
export const getStudioDetails = async (req, res) => {
  try {
    const studio = await Studio.findOne({ uniqueRoomId: req.params.roomId });

    if (!studio) {
      return res.status(404).json({ message: 'Studio not found' });
    }

    // Check if the currently authenticated user is the host
    const isHost = studio.host.equals(req.user._id);

    res.json({
      title: studio.title,
      isHost: isHost,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};