import { Express, Router } from 'express';
import usersRouter from './users';
import accessControlRouter from './accessControl';
import companyRouter from './company';
import dataSourceRouter from './dataSource';
import integrationsRouter from './integrations';
import reportsRouter from './reports';
import jobRouter from './job';
import groupsRouter from './groups';
import uploadRouter from './upload';
import sectorsRouter from './sectors';
import socketRouter from './socket';

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
