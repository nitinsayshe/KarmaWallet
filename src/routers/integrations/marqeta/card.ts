import { Router } from 'express';
import * as CardController from '../../../controllers/integrations/marqeta/card';
import * as CardTokenizationController from '../../../controllers/integrations/marqeta/cardTokenization';

import authenticate from '../../../middleware/authenticate';

const router = Router();

router.route('/create')
  .post(authenticate, CardController.createCard);

router.route('/list/:userToken')
  .get(authenticate, CardController.listCards);

router.route('/:cardToken')
  .get(authenticate, CardController.getCardDetails);

router.route('/transition')
  .post(authenticate, CardController.cardTransition);

router.route('/tokenization/:cardToken')
  .post(authenticate, CardTokenizationController.tokenizeCard);

router.route('/detokenization')
  .post(authenticate, CardTokenizationController.deTokenizeCard);

export default router;
