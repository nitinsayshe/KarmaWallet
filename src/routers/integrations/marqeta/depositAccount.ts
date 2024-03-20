import { Router } from 'express';
import * as DepositAccountController from '../../../controllers/integrations/marqeta/depositAcccount';
import authenticate from '../../../middleware/authenticate';
import protectedRequirements from '../../../middleware/protected';
import { UserRoles } from '../../../lib/constants';

const router = Router();

router.route('/transition')
  .post(
    authenticate,
    protectedRequirements({ roles: [UserRoles.Admin, UserRoles.SuperAdmin] }),
    DepositAccountController.transitionDepositAccount,
  );

router.route('/')
  .get(authenticate, DepositAccountController.listDepositAccounts);

router.route('/:token')
  .get(authenticate, DepositAccountController.getDepositAccountByToken);

router.route('/create/:userId')
  .post(
    authenticate,
    protectedRequirements({ roles: [UserRoles.Admin, UserRoles.SuperAdmin] }),
    DepositAccountController.createDepositAccountForUser,
  );

export default router;
