import { Router } from 'express';
import * as CardController from '../../../controllers/integrations/marqeta/card';
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

export default router;
