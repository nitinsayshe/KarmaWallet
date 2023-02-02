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

router.route('/')
  .post(
    authenticate,
    protectedRequirements({ roles: [UserRoles.Admin, UserRoles.SuperAdmin] }),
    AdminCampaignController.createCampaign,
  );

router.route('/:campaignId')
  .put(
    authenticate,
    protectedRequirements({ roles: [UserRoles.Admin, UserRoles.SuperAdmin] }),
    AdminCampaignController.updateCampaign,
  );

export default router;
