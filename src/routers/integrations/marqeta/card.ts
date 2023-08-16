import { Router } from 'express';
import * as CardController from '../../../controllers/integrations/marqeta/card';

const router = Router();

router.route('/create/:userToken')
  .post(CardController.createCard);

router.route('/list/:userToken')
  .get(CardController.listCards);

router.route('/:cardToken')
  .get(CardController.getCardDetails);

router.route('/transition')
  .post(CardController.cardTransition);

export default router;
