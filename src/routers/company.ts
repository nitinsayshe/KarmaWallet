import { Express, Router } from 'express';
import * as CompanyController from '../controllers/company';
import * as MockController from '../controllers/mock';

const router = Router();

router.get('/', CompanyController.getCompanies);
router.get('/partners', MockController.test);
router.get('/compare', MockController.test);
router.get('/sample', CompanyController.getSample);
router.get('/score-range', CompanyController.getCompanyScoreRange);
router.get('/:companyId/merchant-rates', CompanyController.getMerchantRatesForCompany);
router.get('/:companyId', CompanyController.getCompanyById);

// see admin for company create/update/delete routes

export default (app: Express) => app.use('/company', router);
