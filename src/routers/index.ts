import { Express } from 'express';
import user from './user';
import jobPostings from './jobPostings';
import unsdgs from './unsdgs';
import meta from './meta';
import admin from './admin';
import transaction from './transaction';
import impact from './impact';
import company from './company';
// import sector from './sector';
// import subsector from './subsector';
import webhook from './webhooks';
import comparisonGame from './comparisonGame';
import { group, groups } from './group';
import notFound from './404';
import image from './image';

const routers = (app: Express) => {
  user(app);
  jobPostings(app);
  unsdgs(app);
  admin(app);
  meta(app);
  company(app);
  transaction(app);
  impact(app);
  image(app);
  // sector(app);
  // subsector(app);
  webhook(app);
  comparisonGame(app);
  group(app);
  groups(app);
  // notFound is a catch all and should be last
  notFound(app);
  return app;
};

export default routers;
