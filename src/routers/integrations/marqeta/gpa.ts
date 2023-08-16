import { Router } from 'express';
import * as GPAController from '../../../controllers/integrations/marqeta/gpa';

const router = Router();

router.route('/addfund/:userToken')
  .post(GPAController.fundUserGPA);

router.route('/balance/:userToken')
  .get(GPAController.getGPAbalance);

export default router;
