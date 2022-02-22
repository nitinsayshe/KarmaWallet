import { Express, Router } from 'express';
import * as WebhooksController from '../controllers/webhooks';

const router = Router();

router.route('/rare')
  .post(WebhooksController.mapRareTransaction);

export default (app: Express) => app.use('/webhook', router);
