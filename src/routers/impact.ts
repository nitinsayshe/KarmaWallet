import { Express, Router } from 'express';
import * as ImpactController from '../controllers/impact';
import authenticate from '../middleware/authenticate';

const router = Router();

router.route('/carbon')
  .get(ImpactController.getCarbonOffsetsAndEmissions);

router.route('/carbon/offset/donation-suggestions')
  .get(authenticate, ImpactController.getCarbonOffsetDonationSuggestions);

router.route('/top-companies')
  .get(ImpactController.getTopCompanies);

router.route('/top-sectors')
  .get(ImpactController.getTopSectors);

router.route('/user/data')
  .get(authenticate, ImpactController.getUserImpactData);

export default (app: Express) => app.use('/impact', router);
