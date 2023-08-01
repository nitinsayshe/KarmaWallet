import { Express } from 'express';
import all from './all';
import company from './company';
import compare from './compare';

const routers = (app: Express) => {
  company(app);
  compare(app);
  // all is a catch all and should be last
  all(app);
  return app;
};

export default routers;
