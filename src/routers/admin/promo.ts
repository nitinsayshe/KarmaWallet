import { Router } from 'express';
import * as AdminPromoController from '../../controllers/admin/promo';
import { UserRoles } from '../../lib/constants';
import authenticate from '../../middleware/authenticate';
import protectedRequirements from '../../middleware/protected';

const router = Router();

router.route('/create')
  .post(
    authenticate,
    protectedRequirements({ roles: [UserRoles.Member, UserRoles.Admin, UserRoles.SuperAdmin] }),
    AdminPromoController.createPromo,
  );

router.route('/:promoId')
  .put(
    authenticate,
    protectedRequirements({ roles: [UserRoles.Member, UserRoles.Admin, UserRoles.SuperAdmin] }),
    AdminPromoController.updatePromo,
  );
export default router;
