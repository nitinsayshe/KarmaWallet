import { Express, Router } from 'express';
import * as KarmaCardController from '../controllers/karmaCard';

const router = Router();

router.post('/apply', KarmaCardController.applyForKarmaCard);

router.get('/applications', KarmaCardController.getKarmaCardApplications);

export default (app: Express) => app.use('/karma-card', router);
