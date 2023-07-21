import express, { Express } from 'express';
import * as CompanyController from '../../controllers/frontend/company';

const router = express.Router();

router.get('/:companyId', CompanyController.getCompanyById);
router.get('/:companyId/:companyName', CompanyController.getCompanyById);

const all = (app: Express) => app.use('/company', router);

export default all;
