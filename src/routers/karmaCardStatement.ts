import { Express, Router } from 'express';
import * as KarmaCardStatementController from '../controllers/karmaCardStatement';

const router = Router();

router.get('/statementId', KarmaCardStatementController.getKarmaCardStatement);

export default (app: Express) => app.use('/karma-card-statement', router);
