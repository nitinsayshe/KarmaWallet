import { Express, Router } from 'express';
import * as UserImpactReportController from '../controllers/userImpactReport';
import authenticate from '../middleware/authenticate';

const router = Router();

router.route('/summary')
  .get(authenticate, UserImpactReportController.getUserImpactReportsSummary);

router.route('/:reportId')
  .get(authenticate, UserImpactReportController.getUserImpactReport);

export default (app: Express) => app.use('/user-impact-reports', router);
