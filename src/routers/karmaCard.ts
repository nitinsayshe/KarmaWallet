import { Express, Router } from 'express';
import * as KarmaCardController from '../controllers/karmaCard';
import authenticate from '../middleware/authenticate';

const router = Router();

router.post('/apply', KarmaCardController.applyForKarmaCard);
router.get('/applications', KarmaCardController.getKarmaCardApplications);
router.get('/legal-text', KarmaCardController.getKarmaCardLegalText);
router.post('/membership', authenticate, KarmaCardController.addKarmaMembershipToUser);
router.delete('/membership/:type', authenticate, KarmaCardController.cancelKarmaMembership);
router.put('/membership/:paymentPlan', authenticate, KarmaCardController.updateKarmaMembershipPaymentPlan);

export default (app: Express) => app.use('/karma-card', router);
