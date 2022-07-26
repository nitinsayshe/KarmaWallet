import { Router } from 'express';
import multer from 'multer';
import * as AdminDataSourceController from '../../controllers/admin/dataSource';
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
    AdminDataSourceController.createBatchedDataSources,
  );

export default router;
