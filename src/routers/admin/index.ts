import { Express, Router } from 'express';
import usersRouter from './users';
import accessControlRouter from './accessControl';

const adminRouter = Router();

adminRouter.use('/users', usersRouter);
adminRouter.use('/access-control', accessControlRouter);

export default (app: Express) => app.use('/admin', adminRouter);
