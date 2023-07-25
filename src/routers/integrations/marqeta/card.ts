import { Router } from 'express';
import * as CardController from '../../../controllers/integrations/marqeta/card';
import authenticate from '../../../middleware/authenticate';

const router = Router();

router.route('/create')
  .post(authenticate, CardController.createCard);

router.route('/list/:userToken')
  .get(CardController.listCards);

router.route('/transition')
  .post(CardController.cardTransition);

router.route('/:cardToken')
  .get(CardController.getCardDetails);

export default router;
