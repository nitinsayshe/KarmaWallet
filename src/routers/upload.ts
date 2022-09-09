import { Express, Router } from 'express';
import multer from 'multer';
import authenticate from '../middleware/authenticate';
import * as UploadController from '../controllers/upload';

const router = Router();

const upload = multer();

router.post('/image', authenticate, upload.single('file'), UploadController.uploadImage);
router.post('/image/from-url', authenticate, UploadController.downloadImageFromUrlAndStoreInS3);

export default (app: Express) => app.use('/upload', router);
