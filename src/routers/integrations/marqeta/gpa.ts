import { Router } from 'express';
import * as GPAController from '../../../controllers/integrations/marqeta/gpa';
// import authenticate from '../../middleware/authenticate';

const router = Router();

router.route('/addfund')
  .post(GPAController.fundUserGPA);

router.route('/balance/:userToken')
  .get(GPAController.getGPAbalance);

export default router;
