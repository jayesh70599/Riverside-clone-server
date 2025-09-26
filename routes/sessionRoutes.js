import express from 'express';
import { getSessionsByStudio } from '../controllers/sessionController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/studio/:studioId').get(protect, getSessionsByStudio);

export default router;