import { Router } from 'express';
import * as ACHGroupController from '../../../controllers/integrations/marqeta/accountHolderGroup';
// import authenticate from '../../middleware/authenticate';

const router = Router();

router.route('/create')
  .post(ACHGroupController.createACHGroup);

router.route('/list')
  .get(ACHGroupController.listACHGroup);

router.route('/:accountGroupToken')
  .get(ACHGroupController.getACHGroup);

router.route('/update/:accountGroupToken')
  .put(ACHGroupController.updateACHGroup);

export default router;
