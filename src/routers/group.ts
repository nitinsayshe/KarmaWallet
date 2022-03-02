import { Express, Router } from 'express';
import * as GroupController from '../controllers/group';
import authenticate from '../middleware/authenticate';

const router = Router();

router.route('/')
  .get(GroupController.getGroup)
  .post(authenticate, GroupController.createGroup);

router.route('/join')
  .post(authenticate, GroupController.joinGroup);

export default (app: Express) => app.use('/group', router);
