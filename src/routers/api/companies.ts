import { Router } from 'express';
import authenticate from '../../middleware/authenticate';
import * as CompaniesController from '../../controllers/api/companies';

const router = Router();

router.route('/').get(authenticate, CompaniesController.getCompanies);

export default router;
