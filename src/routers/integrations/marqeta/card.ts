import { Router } from 'express';
import * as CardController from '../../../controllers/integrations/marqeta/card';
// import authenticate from '../../middleware/authenticate';

const router = Router();

router.route('/create')
  .post(CardController.createCard);

router.route('/list/:userToken')
  .get(CardController.listCards);

router.route('/transition')
  .get(CardController.cardTransition);

export default router;
