import { Express, Router } from 'express';
import * as WebhooksController from '../controllers/webhooks';

const router = Router();

router.route('/rare')
  .post(WebhooksController.mapRareTransaction);

router.route('/persona')
  .post(WebhooksController.handlePersonaWebhook);

router.route('/plaid')
  .post(WebhooksController.handlePlaidWebhook);

router.route('/wildfire')
  .post(WebhooksController.handleWildfireWebhook);

router.route('/paypal')
  .post(WebhooksController.handlePaypalWebhook);

router.route('/kard')
  .post(WebhooksController.handleKardWebhook);

router.route('/marqeta')
  .post(WebhooksController.handleMarqetaWebhook);

// legacy api passthrough route
router.route('/plaid/user-transactions-map')
  .post(WebhooksController.userPlaidTransactionsMap);

export default (app: Express) => app.use('/webhook', router);
