import { Express, Router } from 'express';
import * as ArticleController from '../controllers/article';

const router = Router();

router.get('/:articleId', ArticleController.getArticleById);

export default (app: Express) => app.use('/industry-report', router);
