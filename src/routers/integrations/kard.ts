import { Router } from 'express';
import * as KardController from '../../controllers/integrations/kard';
import authenticate from '../../middleware/authenticate';

const router = Router();

router.get('/location/:locationId', KardController.getLocation);
router.get('/locations', KardController.getLocations);
router.get('/locations/merchant/:merchantId', KardController.getMerchantLocations);
router.get('/locations/eligible', authenticate, KardController.getEligibleLocations);

export default router;
