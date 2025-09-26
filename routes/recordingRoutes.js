import express from 'express';
import { saveRecording, getRecordings, getRecordingsBySession } from '../controllers/recordingController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/').post(protect, saveRecording);
router.route('/:studioId').get(protect, getRecordings);

router.route('/session/:sessionId').get(protect, getRecordingsBySession);

export default router;