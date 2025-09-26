import express from 'express';
import { getDownloadUrl, startMultipartUpload, getMultipartUploadUrl, completeMultipartUpload, getDownloadUrlCombined } from '../controllers/uploadController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

//router.route('/').get(protect, getUploadUrl);

// Routes for Multipart Upload
router.post('/start-multipart', protect, startMultipartUpload);
router.post('/multipart-url', protect, getMultipartUploadUrl);
router.post('/complete-multipart', protect, completeMultipartUpload);

// Route for downloading
router.get('/:fileName', protect, getDownloadUrl);
router.get('/combined-videos/:fileName', protect, getDownloadUrlCombined);

export default router;