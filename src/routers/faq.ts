import { Express, Router } from 'express';
import * as FAQController from '../controllers/faq';

const router = Router();

router.get('/', FAQController.getFAQs);

export default (app: Express) => app.use('/faqs', router);
