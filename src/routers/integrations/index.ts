import { Express, Router } from 'express';
import rareRouter from './rare';

/**
 * this file is used for direct communication with the integration APIs
 * it should only be used when the response from the integration API should be served to the client
 * rather than it being used for side effects/state changes in the DB
 *
 * e.g.: the client needs a link token from Plaid and the link token is not stored in the DB or used for anything else other than to return to the client
 */

const integrationsRouter = Router();

integrationsRouter.use('/rare', rareRouter);

export default (app: Express) => app.use('/integrations', integrationsRouter);
