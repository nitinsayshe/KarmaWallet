import { Express, Router } from 'express';
import * as BannerController from '../controllers/banner';

const router = Router();

router.get('/', BannerController.getActiveBanners);
// see admin for banner create/update routes

export default (app: Express) => app.use('/banner', router);
