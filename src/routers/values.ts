import { Express, Router } from 'express';
import * as ValuesController from '../controllers/values';

const router = Router();

router.route('/company/:companyId')
  .put(ValuesController.updateCompanyValues);

router.route('/company')
  .get(ValuesController.getCompanyValues);

export default (app: Express) => app.use('/values', router);
