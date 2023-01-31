import { Express, Router } from 'express';
import * as CommissionController from '../controllers/commission';
import authenticate from '../middleware/authenticate';

const router = Router();

router.route('/dashboard')
  .get(authenticate, CommissionController.getCommissionDashboardSummary);

router.route('/payout')
  .get(authenticate, CommissionController.getCommissionsForUserByPayout);

router.route('/getAll/:type')
  .get(authenticate, CommissionController.getCommissionsForAllUsers);

export default (app: Express) => app.use('/commission', router);
