import { Router } from 'express';
import multer from 'multer';
import * as AdminUploadController from '../../controllers/admin/upload';
import { UserRoles } from '../../lib/constants';
import authenticate from '../../middleware/authenticate';
import protectedRequirements from '../../middleware/protected';

const upload = multer();

const router = Router();

router.route('/csv')
  .post(authenticate, protectedRequirements({ roles: [UserRoles.Member, UserRoles.Admin, UserRoles.SuperAdmin] }), upload.single('file'), AdminUploadController.uploadCsv);

export default router;
