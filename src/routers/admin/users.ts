import { Router } from 'express';
import * as AdminUserController from '../../controllers/admin/users';
import { UserRoles } from '../../lib/constants';
import authenticate from '../../middleware/authenticate';
import protectedRequirements from '../../middleware/protected';

const router = Router();

const usersRoute = router.route('/');
usersRoute.get(
  authenticate,
  protectedRequirements({ roles: [UserRoles.Member, UserRoles.Admin, UserRoles.SuperAdmin] }),
  AdminUserController.getUsersPaginated,
);
usersRoute.delete(
  authenticate,
  protectedRequirements({ roles: [UserRoles.SuperAdmin] }),
  AdminUserController.deleteUser,
);

router.post(
  '/test-identities/reset',
  authenticate,
  protectedRequirements({ roles: [UserRoles.SuperAdmin] }),
  AdminUserController.resetTestIdentities,
);

router.put(
  '/:user/unlock-account',
  authenticate,
  protectedRequirements({ roles: [UserRoles.Admin, UserRoles.SuperAdmin] }),
  AdminUserController.unlockAccount,
);

export default router;
