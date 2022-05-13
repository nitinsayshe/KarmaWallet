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
import notFound from './404';
import upload from './upload';

const routers = (app: Express) => {
  user(app);
  jobPostings(app);
  unsdgs(app);
  admin(app);
  meta(app);
  company(app);
  transaction(app);
  impact(app);
  upload(app);
  sectors(app);
  webhook(app);
  integrations(app);
  comparisonGame(app);
  group(app);
  groups(app);
  // notFound is a catch all and should be last
  notFound(app);
  return app;
};

export default routers;
