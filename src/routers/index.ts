import { Express } from 'express';
import user from './user';
import jobPostings from './jobPostings';
import unsdgs from './unsdgs';
import meta from './meta';
import admin from './admin';
import integrations from './integrations';
import transaction from './transaction';
import impact from './impact';
import company from './company';
import sectors from './sectors';
import webhook from './webhooks';
import comparisonGame from './comparisonGame';
import { group, groups } from './group';
import card from './card';
import notFound from './404';
import upload from './upload';
import userImpactReports from './userImpactReports';
import dataSource from './dataSource';
import values from './values';

const routers = (app: Express) => {
  admin(app);
  card(app);
  company(app);
  comparisonGame(app);
  group(app);
  groups(app);
  impact(app);
  integrations(app);
  jobPostings(app);
  meta(app);
  sectors(app);
  transaction(app);
  unsdgs(app);
  upload(app);
  user(app);
  dataSource(app);
  userImpactReports(app);
  values(app);
  webhook(app);
  // notFound is a catch all and should be last
  notFound(app);
  return app;
};

export default routers;
