import { Express, Router } from 'express';
import * as PlaidController from '../../controllers/integrations/plaid';
import authenticate from '../../middleware/authenticate';

const router = Router();

router.route('/plaid/create-link-token')
  .post(authenticate, PlaidController.createLinkToken);

router.route('/plaid/exchange-public-token')
  .post(authenticate, PlaidController.exchangePublicToken);

export default (app: Express) => app.use('/plaid', router);
