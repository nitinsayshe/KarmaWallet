import { Express, Router } from 'express';
import * as CompanyController from '../controllers/company';
import * as MockController from '../controllers/mock';

const router = Router();

router.get('/', CompanyController.listCompanies);
router.get('/:companyId', MockController.test);
router.get('/:companyId/unsdgs', MockController.test);
router.get('/partners', MockController.test);
router.get('/sample', MockController.test);
router.get('/compare', MockController.test);

// see admin for company create/update/delete routes

export default (app: Express) => app.use('/company', router);
