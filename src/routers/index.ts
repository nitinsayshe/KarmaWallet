import { Express } from 'express';
import user from './user';
import jobs from './jobs';
import unsdgs from './unsdgs';
import meta from './meta';
import admin from './admin';
import transaction from './transaction';
import impact from './impact';
import company from './company';
// import sector from './sector';
// import subsector from './subsector';
// import webhook from './webhook';
import notFound from './404';
import comparisonGame from './comparisonGame';

const routers = (app: Express) => {
  user(app);
  jobs(app);
  unsdgs(app);
  admin(app);
  meta(app);
  company(app);
  transaction(app);
  impact(app);
  // sector(app);
  // subsector(app);
  // webhook(app);
  comparisonGame(app);
  // notFound is a catch all and should be last
  notFound(app);
  return app;
};

export default routers;
