import { Express, Router } from 'express';
import * as MarketingSubscriptionController from '../controllers/marketingSubscription';

const router = Router();
router.put('/newsletter-unsubscribe', MarketingSubscriptionController.newsletterUnsubscribe);
export default (app: Express) => app.use('/subscription', router);
