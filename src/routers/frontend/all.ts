import express, { Express } from 'express';
import * as AllController from '../../controllers/frontend/all';

const router = express.Router();

router.get('*', AllController.sendAll);

const all = (app: Express) => app.use('/', router);

export default all;
