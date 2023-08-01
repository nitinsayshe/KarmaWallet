import express, { Express } from 'express';
import * as CompareController from '../../controllers/frontend/compare';

const router = express.Router();

router.get('/', CompareController.compareCompanies);

const all = (app: Express) => app.use('/compare-companies', router);

export default all;
