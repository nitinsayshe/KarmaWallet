import { Router } from 'express';
import * as DepositAccountController from '../../../controllers/integrations/marqeta/depositAcccount';
import authenticate from '../../../middleware/authenticate';
import protectedRequirements from '../../../middleware/protected';
import { UserRoles } from '../../../lib/constants';

const router = Router();

router.route('/')
  .get(authenticate, DepositAccountController.listDepositAccounts);

router.route('/:token')
  .get(authenticate, DepositAccountController.getDepositAccountByToken);

router.route('/transition')
  .post(
    authenticate,
    protectedRequirements({ roles: [UserRoles.Admin, UserRoles.SuperAdmin] }),
    DepositAccountController.transitionDepositAccount,
  );

export default router;
