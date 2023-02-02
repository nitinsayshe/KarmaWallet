import { Router } from 'express';
import * as AdminCampaignController from '../../controllers/admin/campaign';
import { UserRoles } from '../../lib/constants';
import authenticate from '../../middleware/authenticate';
import protectedRequirements from '../../middleware/protected';

const router = Router();

router.route('/')
  .get(
    authenticate,
    protectedRequirements({ roles: [UserRoles.Member, UserRoles.Admin, UserRoles.SuperAdmin] }),
    AdminCampaignController.getCampaigns,
  );
export default router;
