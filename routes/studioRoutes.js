// /server/routes/studioRoutes.js

import express from 'express';
import { createStudio, getStudios, getStudioDetails } from '../controllers/studioController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply the 'protect' middleware to both routes
router.route('/').post(protect, createStudio).get(protect, getStudios);

// New route for getting specific studio details
router.route('/:roomId/details').get(protect, getStudioDetails);

export default router;