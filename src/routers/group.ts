import { Express, Router } from 'express';
import * as GroupController from '../controllers/group';
import authenticate from '../middleware/authenticate';

const groupRouter = Router();
const groupsRouter = Router();

groupRouter.route('/join')
  .post(authenticate, GroupController.joinGroup);

groupRouter.route('/:groupId?')
  .get(GroupController.getGroup)
  .post(authenticate, GroupController.createGroup);

export const group = (app: Express) => app.use('/group', groupRouter);

groupsRouter.route('/')
  .get(GroupController.getGroups);

groupsRouter.route('/user/:userId')
  .get(authenticate, GroupController.getUserGroups);

export const groups = (app: Express) => app.use('/groups', groupsRouter);
