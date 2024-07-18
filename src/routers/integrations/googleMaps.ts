import { Router } from 'express';
import authenticate from '../../middleware/authenticate';
import * as GoogleMapsController from '../../controllers/integrations/googleMaps';

const router = Router();

router.get('/get-coordinates/:zipCode', authenticate, GoogleMapsController.getCoordinates);
export default router;
