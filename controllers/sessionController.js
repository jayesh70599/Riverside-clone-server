import Session from '../models/sessionModel.js';
import Studio from '../models/studioModel.js';

export const getSessionsByStudio = async (req, res) => {
  try {
    const studio = await Studio.findById(req.params.studioId);
    if (!studio) {
      return res.status(404).json({ message: 'Studio not found' });
    }
    // Ensure only the host can see the sessions
    if (!studio.host.equals(req.user._id)) {
      return res.status(403).json({ message: 'User not authorized' });
    }
    const sessions = await Session.find({ studio: req.params.studioId }).sort({ createdAt: -1 });
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

