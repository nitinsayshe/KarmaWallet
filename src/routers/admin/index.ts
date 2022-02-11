import { Express, Router } from 'express';
import usersRouter from './users';
import accessControlRouter from './accessControl';
import integrationsRouter from './integrations';
import reportsRouter from './reports';

const adminRouter = Router();

adminRouter.use('/users', usersRouter);
adminRouter.use('/access-control', accessControlRouter);
adminRouter.use('/integrations', integrationsRouter);
adminRouter.use('/reports', reportsRouter);

export default (app: Express) => app.use('/admin', adminRouter);
