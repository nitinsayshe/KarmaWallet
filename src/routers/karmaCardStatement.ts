import { Express, Router } from 'express';
import * as KarmaCardStatementController from '../controllers/karmaCardStatement';

const router = Router();

router.get('/:statementId', KarmaCardStatementController.getKarmaCardStatement);

router.get('/pdf/:statementId', KarmaCardStatementController.getKarmaCardStatementPDF);

export default (app: Express) => app.use('/karma-card-statement', router);
