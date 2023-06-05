import { Express, Router } from 'express';
import * as ArticleController from '../controllers/article';

const router = Router();

router.get('/', ArticleController.getAllArticles);
router.get('/:articleId', ArticleController.getArticleById);
router.get('/sample', ArticleController.getRandomArticle);

export default (app: Express) => app.use('/article', router);
