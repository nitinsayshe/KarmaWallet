import { Express, Router } from 'express';
import * as VisitorController from '../controllers/visitor';

const router = Router();
router.post('/newsletter-signup', VisitorController.newsletterSignup);
router.post('/submit-interest-form', VisitorController.submitInterestForm);
router.post('/create-account-request', VisitorController.createAccountForm);
router.post('/token/verify', VisitorController.verifyAccountToken);

export default (app: Express) => app.use('/visitor', router);
