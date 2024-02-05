import { Router } from 'express';
import { UserRoles } from '../../lib/constants';
import authenticate from '../../middleware/authenticate';
import protectedRequirements from '../../middleware/protected';
import * as WebAnalyticsController from '../../controllers/admin/webAnalytics';

const router = Router();

router.get(
  '/',
  authenticate,
  protectedRequirements({ roles: [UserRoles.Admin, UserRoles.SuperAdmin] }),
  WebAnalyticsController.getAllWebAnalytics,
);

router.get(
  '/locations',
  authenticate,
  protectedRequirements({ roles: [UserRoles.Admin, UserRoles.SuperAdmin] }),
  WebAnalyticsController.getWebAnalyticsLocations,
);

router.get(
  '/:location',
  authenticate,
  protectedRequirements({ roles: [UserRoles.Admin, UserRoles.SuperAdmin] }),
  WebAnalyticsController.getWebAnalyticsByPage,
);

router.post(
  '/',
  authenticate,
  protectedRequirements({ roles: [UserRoles.Admin, UserRoles.SuperAdmin] }),
  WebAnalyticsController.createWebAnalytics,
);

router.put(
  '/:id',
  authenticate,
  protectedRequirements({ roles: [UserRoles.Admin, UserRoles.SuperAdmin] }),
  WebAnalyticsController.updateWebAnalytics,
);

router.delete(
  '/:id',
  authenticate,
  protectedRequirements({ roles: [UserRoles.Admin, UserRoles.SuperAdmin] }),
  WebAnalyticsController.deleteWebAnalyticsById,
);

export default router;
