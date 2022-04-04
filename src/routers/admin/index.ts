import { Express, Router } from 'express';
import usersRouter from './users';
import accessControlRouter from './accessControl';
import integrationsRouter from './integrations';
import reportsRouter from './reports';
import jobRouter from './job';
import groupsRouter from './groups';
import uploadRouter from './upload';

const adminRouter = Router();

adminRouter.use('/users', usersRouter);
adminRouter.use('/access-control', accessControlRouter);
adminRouter.use('/integrations', integrationsRouter);
adminRouter.use('/reports', reportsRouter);
adminRouter.use('/job', jobRouter);
adminRouter.use('/groups', groupsRouter);
adminRouter.use('/upload', uploadRouter);

export default (app: Express) => app.use('/admin', adminRouter);
