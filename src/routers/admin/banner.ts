import { Router } from 'express';
import * as AdminBannerController from '../../controllers/admin/banner';
import { UserRoles } from '../../lib/constants';
import authenticate from '../../middleware/authenticate';
import protectedRequirements from '../../middleware/protected';

const router = Router();

router.route('/')
  .get(
    authenticate,
    protectedRequirements({ roles: [UserRoles.Member, UserRoles.Admin, UserRoles.SuperAdmin] }),
    AdminBannerController.getBanners,
  );

router.route('/')
  .post(
    authenticate,
    protectedRequirements({ roles: [UserRoles.Admin, UserRoles.SuperAdmin] }),
    AdminBannerController.createBanner,
  );

router.route('/:bannerId')
  .put(
    authenticate,
    protectedRequirements({ roles: [UserRoles.Admin, UserRoles.SuperAdmin] }),
    AdminBannerController.updateBanner,
  );

export default router;
