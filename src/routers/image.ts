import { Express, Router } from 'express';
import multer from 'multer';
import authenticate from '../middleware/authenticate';
import * as ImageController from '../controllers/image';

const router = Router();

const upload = multer();

router.post('/', authenticate, upload.single('file'), ImageController.uploadImage);

export default (app: Express) => app.use('/image', router);
