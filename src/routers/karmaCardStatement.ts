import { Express, Router } from 'express';
import * as KarmaCardStatementController from '../controllers/karmaCardStatement';
import authenticate from '../middleware/authenticate';

const router = Router();

router.route('/')
  .get(authenticate, KarmaCardStatementController.getKarmaCardStatements);

router.route('/:statementId')
  .get(authenticate, KarmaCardStatementController.getKarmaCardStatement);

router.route('/pdf/:statementId')
  .get(authenticate, KarmaCardStatementController.getKarmaCardStatementPDF);

export default (app: Express) => app.use('/karma-card-statement', router);
