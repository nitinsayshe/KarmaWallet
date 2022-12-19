import { Express, Router } from 'express';
import * as SubscriptionController from '../controllers/subscription';

const router = Router();
router.put('/newsletter-unsubscribe', SubscriptionController.newsletterUnsubscribe);
export default (app: Express) => app.use('/subscription', router);
