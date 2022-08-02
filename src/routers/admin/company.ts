import { Router } from 'express';
import multer from 'multer';
import * as AdminCompanyController from '../../controllers/admin/company';
import { UserRoles } from '../../lib/constants';
import authenticate from '../../middleware/authenticate';
import protectedRequirements from '../../middleware/protected';

const router = Router();
const upload = multer();

router.route('/batch')
  .post(
    authenticate,
    protectedRequirements({ roles: [UserRoles.Member, UserRoles.Admin, UserRoles.SuperAdmin] }),
    upload.single('file'),
    AdminCompanyController.createBatchedCompanies,
  );

router.route('/batch/data-source')
  .post(
    authenticate,
    protectedRequirements({ roles: [UserRoles.Member, UserRoles.Admin, UserRoles.SuperAdmin] }),
    upload.single('file'),
    AdminCompanyController.mapBatchedCompaniesToDataSources,
  );

router.route('/batch/parent-child')
  .post(
    authenticate,
    protectedRequirements({ roles: [UserRoles.Member, UserRoles.Admin, UserRoles.SuperAdmin] }),
    upload.single('file'),
    AdminCompanyController.updateBatchedCompaniesParentChildRelationships,
  );

router.route('/:companyId')
  .put(authenticate, protectedRequirements({ roles: [UserRoles.Member, UserRoles.Admin, UserRoles.SuperAdmin] }), AdminCompanyController.updateCompany);

export default router;
