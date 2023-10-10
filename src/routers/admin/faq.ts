import { Router } from 'express';
import { UserRoles } from '../../lib/constants';
import authenticate from '../../middleware/authenticate';
import protectedRequirements from '../../middleware/protected';
import * as FAQController from '../../controllers/admin/faq';

const router = Router();

router.post(
  '/',
  authenticate,
  protectedRequirements({ roles: [UserRoles.Admin, UserRoles.SuperAdmin] }),
  FAQController.createFAQ,
);

router.put(
  '/:faqID',
  authenticate,
  protectedRequirements({ roles: [UserRoles.Admin, UserRoles.SuperAdmin] }),
  FAQController.updateFAQ,
);

export default router;
