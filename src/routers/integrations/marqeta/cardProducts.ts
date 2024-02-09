import { Router } from 'express';
import * as CardProductController from '../../../controllers/integrations/marqeta/cardProducts';

const router = Router();

router.route('/create')
  .post(CardProductController.createCardProduct);

router.route('/list')
  .get(CardProductController.listCardProduct);

router.route('/:cardProductToken')
  .get(CardProductController.getCardproduct);

export default router;
