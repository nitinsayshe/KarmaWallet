import { Express } from 'express';
import user from './user';
import jobPostings from './jobPostings';
import unsdgs from './unsdgs';
import meta from './meta';
import admin from './admin';
import integrations from './integrations';
import api from './api';
import transaction from './transaction';
import impact from './impact';
import company from './company';
import article from './article';
import sectors from './sectors';
import webhook from './webhooks';
import commission from './commission';
import comparisonGame from './comparisonGame';
import { group, groups } from './group';
import card from './card';
import notFound from './404';
import subscription from './subscription';
import upload from './upload';
import userImpactReports from './userImpactReports';
import dataSource from './dataSource';
import values from './values';
import visitor from './visitor';
import promo from './promo';
import banner from './banner';
import karmaCard from './karmaCard';

const routers = (app: Express) => {
  admin(app);
  card(app);
  article(app);
  company(app);
  comparisonGame(app);
  group(app);
  groups(app);
  impact(app);
  integrations(app);
  api(app);
  jobPostings(app);
  meta(app);
  sectors(app);
  subscription(app);
  transaction(app);
  unsdgs(app);
  upload(app);
  user(app);
  visitor(app);
  dataSource(app);
  userImpactReports(app);
  values(app);
  commission(app);
  webhook(app);
  promo(app);
  banner(app);
  karmaCard(app);
  // notFound is a catch all and should be last
  notFound(app);
  return app;
};

export default routers;
