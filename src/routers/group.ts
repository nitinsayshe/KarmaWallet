import { Express, Router } from 'express';
import * as GroupController from '../controllers/group';
import authenticate from '../middleware/authenticate';

const router = Router();

router.route('/')
  .get(authenticate, GroupController.getGroup);

export default (app: Express) => app.use('/group', router);
