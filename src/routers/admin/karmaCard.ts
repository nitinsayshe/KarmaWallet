import { Router } from 'express';
import { UserRoles } from '../../lib/constants';
import authenticate from '../../middleware/authenticate';
import protectedRequirements from '../../middleware/protected';
import * as KarmaCardController from '../../controllers/admin/karmaCard';

const router = Router();

router.get(
  '/legal-text',
  authenticate,
  protectedRequirements({ roles: [UserRoles.Member, UserRoles.Admin, UserRoles.SuperAdmin] }),
  KarmaCardController.getKarmaCardLegalText,
);

router.post(
  '/legal-text',
  authenticate,
  protectedRequirements({ roles: [UserRoles.Member, UserRoles.Admin, UserRoles.SuperAdmin] }),
  KarmaCardController.createKarmaCardLegalText,
);

// router.put(
//   '/:legalTextId',
//   authenticate,
//   protectedRequirements({ roles: [UserRoles.Member, UserRoles.Admin, UserRoles.SuperAdmin] }),
//   ArticleController.updateKarmaCardLegalText,
// );

export default router;
