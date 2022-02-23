import { Express, Router } from 'express';
import * as WebhooksController from '../controllers/webhooks';

const router = Router();

router.route('/rare')
  .post(WebhooksController.mapRareTransaction);

router.route('/plaid/user-transaction-map')
  .post(WebhooksController.userPlaidTransactionsMap);

export default (app: Express) => app.use('/webhook', router);
