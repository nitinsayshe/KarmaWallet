import { Router } from 'express';
import * as StripePriceController from '../../../controllers/integrations/stripe/price';

const router = Router();

router.get(
  '/list-prices',
  StripePriceController.listPrices,
);

export default router;
