import { Express, Router } from 'express';
import accessControlRouter from './accessControl';
import companyRouter from './company';
import dataSourceRouter from './dataSource';
import groupsRouter from './groups';
import integrationsRouter from './integrations';
import jobRouter from './job';
import reportsRouter from './reports';
import sectorsRouter from './sectors';
import socketRouter from './socket';
import uploadRouter from './upload';
import usersRouter from './users';

const adminRouter = Router();

adminRouter.use('/users', usersRouter);
adminRouter.use('/access-control', accessControlRouter);
adminRouter.use('/company', companyRouter);
adminRouter.use('/data-source', dataSourceRouter);
adminRouter.use('/integrations', integrationsRouter);
adminRouter.use('/reports', reportsRouter);
adminRouter.use('/job', jobRouter);
adminRouter.use('/groups', groupsRouter);
adminRouter.use('/upload', uploadRouter);
adminRouter.use('/sectors', sectorsRouter);
adminRouter.use('/socket', socketRouter);

export default (app: Express) => app.use('/admin', adminRouter);
