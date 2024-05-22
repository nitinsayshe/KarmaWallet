import { Router } from 'express';
import * as StripeProductController from '../../../controllers/integrations/stripe/product';

const router = Router();

router.post(
  '/create',
  StripeProductController.createProduct,
);

export default router;
