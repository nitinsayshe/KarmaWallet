import { Router } from 'express';
import * as AdminCompanyController from '../../controllers/admin/company';
import { UserRoles } from '../../lib/constants';
import authenticate from '../../middleware/authenticate';
import protectedRequirements from '../../middleware/protected';

const router = Router();

router.route('/:companyId')
  .put(authenticate, protectedRequirements({ roles: [UserRoles.Member, UserRoles.Admin, UserRoles.SuperAdmin] }), AdminCompanyController.updateCompany);

export default router;
