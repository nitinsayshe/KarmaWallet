import { Router } from 'express';
import { UserRoles } from '../../lib/constants';
import authenticate from '../../middleware/authenticate';
import protectedRequirements from '../../middleware/protected';
import * as KarmaCardController from '../../controllers/admin/karmaCard';

const router = Router();

router.post(
  '/legal-text',
  authenticate,
  protectedRequirements({ roles: [UserRoles.Member, UserRoles.Admin, UserRoles.SuperAdmin] }),
  KarmaCardController.createKarmaCardLegalText,
);

router.put(
  '/legal-text/:legalTextId',
  authenticate,
  protectedRequirements({ roles: [UserRoles.Member, UserRoles.Admin, UserRoles.SuperAdmin] }),
  KarmaCardController.updateKarmaCardLegalText,
);

router.delete(
  '/legal-text/:legalTextId',
  authenticate,
  protectedRequirements({ roles: [UserRoles.Member, UserRoles.Admin, UserRoles.SuperAdmin] }),
  KarmaCardController.deleteKarmaCardLegalText,
);

export default router;
