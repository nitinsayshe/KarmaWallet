import { Express, Router } from 'express';
import * as CardController from '../controllers/card';
import authenticate from '../middleware/authenticate';

const router = Router();

router.route('/')
  .get(authenticate, CardController.getCards);

router.route('/:card/remove')
  .put(authenticate, CardController.removeCard);

router.route('/:card/rewards/register')
  .put(authenticate, CardController.registerCardInKardRewards);

export default (app: Express) => app.use('/card', router);
