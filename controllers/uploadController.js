import { S3Client, PutObjectCommand, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';
import Recording from '../models/recordingModel.js';
import axios from 'axios';

// Generate a secure, random string for file names
const randomImageName = (bytes = 16) => crypto.randomBytes(bytes).toString('hex');

console.log('Verifying AWS Region from .env:', process.env.AWS_S3_REGION);

// Configure the S3 client
// const s3Client = new S3Client({
//   region: process.env.AWS_S3_REGION,
//   credentials: {
//     accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
//   },
// });

// @desc    Get a pre-signed URL for uploading a file
// @route   GET /api/upload
export const getUploadUrl = async (req, res) => {

const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
  
  try {
    const uniqueFileName = randomImageName();
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: uniqueFileName,
      ContentType: 'video/webm', // Specify the content type
    });

    console.log(process.env.AWS_S3_REGION)
    // Generate the pre-signed URL, which will be valid for 60 seconds
    const signedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 60,
    });


    res.json({ uploadUrl: signedUrl, fileName: uniqueFileName });
  } catch (error) {
    console.error('Error generating pre-signed URL:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


// @desc    Get a pre-signed URL for downloading a file
// @route   GET /api/upload/:fileName
export const getDownloadUrl = async (req, res) => {
  
const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

  try {
    const { fileName } = req.params;

      const command = new GetObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: fileName
      });


    // Generate the pre-signed URL, valid for 60 seconds
    const signedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 60,
    });

    res.json({ downloadUrl: signedUrl });
  } catch (error) {
    console.error('Error generating pre-signed download URL:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getDownloadUrlCombined = async (req, res) => {
  
const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

  try {
    const { fileName } = req.params;
 
    const  command = new GetObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: `combined-videos/${fileName}`,
      });

    // Generate the pre-signed URL, valid for 60 seconds
    const signedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 60,
    });

    res.json({ downloadUrl: signedUrl });
  } catch (error) {
    console.error('Error generating pre-signed download URL:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// STEP 1: Client asks to start a multipart upload
export const startMultipartUpload = async (req, res) => {
  const { fileName, contentType } = req.body;
  
  const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

  try {
    const command = new CreateMultipartUploadCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: fileName,
      ContentType: contentType,
    });
    const { UploadId, Key } = await s3Client.send(command);
    res.json({ uploadId: UploadId, key: Key });
  } catch (error) {
    console.error('Error starting multipart upload:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// STEP 2: Client asks for a pre-signed URL for a specific chunk
export const getMultipartUploadUrl = async (req, res) => {
  
  const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

  const { key, uploadId, partNumber } = req.body;
  try {
    const command = new UploadPartCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: key,
      UploadId: uploadId,
      PartNumber: partNumber,
    });
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 60 });
    res.json({ uploadUrl: signedUrl });
  } catch (error) {
    console.error('Error generating part URL:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// STEP 3: Client signals that all parts are uploaded
export const completeMultipartUpload = async (req, res) => {
  
  const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

  const { key, uploadId, parts, recordingId, sessionId } = req.body;
  try {
    const command = new CompleteMultipartUploadCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: { Parts: parts },
    });
    await s3Client.send(command);
    res.json({ message: 'Upload completed successfully.' });
     if (recordingId) {
          await Recording.findByIdAndUpdate(recordingId, { uploadStatus: 'complete' });
          console.log(`Marked recording ${recordingId} as complete.`);
          
          // Now, check if the whole session is ready
          if (sessionId) {
            await checkAndTriggerWorker(sessionId);
          }
    }

  } catch (error) {
    console.error('Error completing multipart upload:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// A new helper function to check if the session is ready
const checkAndTriggerWorker = async (sessionId) => {
    const sessionRecordings = await Recording.find({ session: sessionId });
    const completedRecordings = sessionRecordings.filter(r => r.uploadStatus === 'complete');
    
    // Check if all recordings for the session are complete
    if (sessionRecordings.length > 0 && sessionRecordings.length === completedRecordings.length) {
        console.log(`All ${sessionRecordings.length} recordings for session ${sessionId} are complete. Triggering worker.`);
        try {
            await axios.post('http://13.127.74.242:5001/create-combined-video', { sessionId });
        } catch (error) {
            console.error('Error triggering worker service:', error.message);
        }
    }
};

