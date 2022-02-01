import { Router } from 'express';
import * as DataController from '../../controllers/admin/data';
import { UserRoles } from '../../lib/constants';
import authenticate from '../../middleware/authenticate';
import protectedRequirements from '../../middleware/protected';

const router = Router();

router.route('/clean-company')
  .post(authenticate, protectedRequirements({ roles: [UserRoles.SuperAdmin] }), DataController.cleanCompany);

export default router;
