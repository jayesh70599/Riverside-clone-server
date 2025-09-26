import Recording from '../models/recordingModel.js';
import Studio from '../models/studioModel.js';

// @desc    Save metadata of a new recording
// @route   POST /api/recordings
export const saveRecording = async (req, res) => {
  const { fileName, studioId } = req.body;

  if (!fileName || !studioId) {
    return res.status(400).json({ message: 'Missing fileName or studioId' });
  }

  try {
    // Find the studio using the uniqueRoomId
    const studio = await Studio.findOne({ uniqueRoomId: studioId });
    if (!studio) {
      return res.status(404).json({ message: 'Studio not found' });
    }

    const newRecording = await Recording.create({
      studio: studio._id, // Use the studio's ObjectId
      user: req.user._id, // User ID from the 'protect' middleware
      filePath: fileName, // This is the unique key for the S3 object
      mediaType: 'video',
    });

    res.status(201).json(newRecording);
  } catch (error) {
    console.error('Error saving recording:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};


// @desc    Get all recordings for a specific studio
// @route   GET /api/recordings/:studioId
export const getRecordings = async (req, res) => {
  try {
    const studio = await Studio.findOne({ uniqueRoomId: req.params.studioId });
    if (!studio) {
      return res.status(404).json({ message: 'Studio not found' });
    }

    // Ensure only the host can see the recordings
    if (!studio.host.equals(req.user._id)) {
      return res.status(403).json({ message: 'User not authorized' });
    }

    const recordings = await Recording.find({ studio: studio._id })
      .populate('user', 'name') // Optionally get the user's name for each recording
      .sort({ createdAt: -1 });

    res.json(recordings);
  } catch (error) {
    console.error('Error fetching recordings:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


// Add this new function to the controller
export const getRecordingsBySession = async (req, res) => {
  try {
    const recordings = await Recording.find({ session: req.params.sessionId })
      .populate('user', 'name');
    res.json(recordings);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};