import { Router } from 'express';
import * as AdminSectorsController from '../../controllers/admin/sectors';
import { UserRoles } from '../../lib/constants';
import authenticate from '../../middleware/authenticate';
import protectedRequirements from '../../middleware/protected';

const router = Router();

router.route('/check-name')
  .get(authenticate, protectedRequirements({ roles: [UserRoles.Member, UserRoles.Admin, UserRoles.SuperAdmin] }), AdminSectorsController.checkName);

router.route('/:sectorId')
  .put(authenticate, protectedRequirements({ roles: [UserRoles.Member, UserRoles.Admin, UserRoles.SuperAdmin] }), AdminSectorsController.updateSector);

export default router;
