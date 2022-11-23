import { Express, Router } from 'express';
import * as VisitorController from '../controllers/visitor';

const router = Router();
router.post('/newsletter-signup', VisitorController.newsletterSignup);

export default (app: Express) => app.use('/visitor', router);
