import { Router } from 'express';
import * as CardController from '../../../controllers/integrations/marqeta/card';
import authenticate from '../../../middleware/authenticate';

const router = Router();

router.route('/create')
  .post(authenticate, CardController.createCard);

router.route('/list')
  .get(authenticate, CardController.listCards);

router.route('/transition')
  .post(CardController.cardTransition);

router.route('/:cardToken')
  .get(authenticate, CardController.getCardDetails);

export default router;
