import { Express, Router } from 'express';
import usersRouter from './users';
import accessControlRouter from './accessControl';
import dataRouter from './data';

const adminRouter = Router();

adminRouter.use('/users', usersRouter);
adminRouter.use('/access-control', accessControlRouter);
adminRouter.use('/data', dataRouter);

export default (app: Express) => app.use('/admin', adminRouter);
