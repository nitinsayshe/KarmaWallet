import { Express, Router } from 'express';
import * as ContactUsController from '../controllers/contactUs';

const router = Router();
router.post('/', ContactUsController.submitContactUsEmail);
export default (app: Express) => app.use('/contact-us', router);
