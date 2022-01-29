import { Express, Router } from 'express';
import * as ComparisonGameController from '../controllers/comparisonGame';

const router = Router();

router.route('/')
  .get(ComparisonGameController.getSwaps);

export default (app: Express) => app.use('/comparison-game', router);
