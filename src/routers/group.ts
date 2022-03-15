import { Express, Router } from 'express';
import * as GroupController from '../controllers/group';
import authenticate from '../middleware/authenticate';

const groupRouter = Router();
const groupsRouter = Router();

groupRouter.route('/join')
  .post(authenticate, GroupController.joinGroup);

groupRouter.route('/check-code')
  .get(GroupController.checkCode);

groupRouter.route('/members/:groupId')
  .get(authenticate, GroupController.getGroupMembers);

groupRouter.route('/leave/:groupId')
  .put(authenticate, GroupController.leaveGroup);

groupRouter.route('/:groupId/user/:userId')
  .put(authenticate, GroupController.updateUserGroup);

groupRouter.route('/:groupId/dashboard')
  .get(GroupController.getGroup);

groupRouter.route('/:groupId?')
  .get(GroupController.getGroup)
  .post(authenticate, GroupController.createGroup)
  .put(authenticate, GroupController.updateGroup)
  .delete(authenticate, GroupController.deleteGroup);

export const group = (app: Express) => app.use('/group', groupRouter);

groupsRouter.route('/')
  .get(GroupController.getGroups);

groupsRouter.route('/user/:userId')
  .get(authenticate, GroupController.getUserGroups);

export const groups = (app: Express) => app.use('/groups', groupsRouter);
