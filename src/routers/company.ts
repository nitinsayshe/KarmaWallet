import { Express, Router } from 'express';
import * as CompanyController from '../controllers/company';

const router = Router();

router.get('/', CompanyController.getCompanies);
router.get('/sample', CompanyController.getSample);
router.get('/partners', CompanyController.getAllPartners);
router.get('/partner', CompanyController.getPartner);
router.get('/score-range', CompanyController.getCompanyScoreRange);
router.get('/featured-cashback', CompanyController.getFeaturedCashbackCompanies);
router.get('/:companyId/merchant-rates', CompanyController.getMerchantRatesForCompany);
router.get('/:companyId', CompanyController.getCompanyById);
router.get('/partners/count', CompanyController.getPartnersCount);

// see admin for company create/update/delete routes

export default (app: Express) => app.use('/company', router);
