import { Express, Router } from 'express';
import { api } from '../services/output';

const router = Router();

router.get('/status', (req, res) => {
  api(req, res, { status: 'API is online' });
});

export default (app: Express) => app.use('/', router);
