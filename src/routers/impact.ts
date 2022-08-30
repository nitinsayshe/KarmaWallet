import { Express, Router } from 'express';
import * as ImpactController from '../controllers/impact';
import authenticate from '../middleware/authenticate';

const router = Router();

router.route('/carbon')
  .get(ImpactController.getCarbonOffsetsAndEmissions);

router.route('/carbon/offset/donation-suggestions')
  .get(authenticate, ImpactController.getCarbonOffsetDonationSuggestions);

router.route('/carbon/tonnes-by-dollar-amount')
  .get(authenticate, ImpactController.getTonnesByByDollarAmount);

router.get('/featured-cashback', ImpactController.getFeaturedCashback);

router.route('/ratings')
  .get(ImpactController.getImpactRatings);

router.route('/top-companies')
  .get(ImpactController.getTopCompanies);

router.route('/top-sectors')
  .get(ImpactController.getTopSectors);

router.route('/user/data')
  .get(authenticate, ImpactController.getUserImpactData);

router.route('/user/lower-impact-purchases')
  .get(authenticate, ImpactController.getUserLowerImpactPurchases);

export default (app: Express) => app.use('/impact', router);
