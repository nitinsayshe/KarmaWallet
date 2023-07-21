import { Router } from 'express';
import { UserRoles } from '../../lib/constants';
import authenticate from '../../middleware/authenticate';
import protectedRequirements from '../../middleware/protected';
import * as UtilitiesController from '../../controllers/admin/utlities';

const router = Router();

router.post(
  '/validate-html',
  authenticate,
  protectedRequirements({ roles: [UserRoles.Member, UserRoles.Admin, UserRoles.SuperAdmin] }),
  UtilitiesController.validateHtml,
);

export default router;
