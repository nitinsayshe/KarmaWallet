import { Express, Router } from 'express';
import * as ArticleController from '../controllers/article';

const router = Router();

router.get('/', ArticleController.getAllArticles);
router.get('/sample', ArticleController.getRandomArticle);
router.get('/:articleId', ArticleController.getArticleById);

export default (app: Express) => app.use('/article', router);
