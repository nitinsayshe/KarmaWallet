import { Router } from 'express';
import { UserRoles } from '../../lib/constants';
import authenticate from '../../middleware/authenticate';
import protectedRequirements from '../../middleware/protected';
import * as ArticleController from '../../controllers/admin/article';

const router = Router();

router.get(
  '/',
  authenticate,
  protectedRequirements({ roles: [UserRoles.Member, UserRoles.Admin, UserRoles.SuperAdmin] }),
  ArticleController.getAllArticles,
);

router.get(
  '/templates',
  authenticate,
  protectedRequirements({ roles: [UserRoles.Member, UserRoles.Admin, UserRoles.SuperAdmin] }),
  ArticleController.getAllArticleTemplates,
);

router.get(
  '/header-types',
  authenticate,
  protectedRequirements({ roles: [UserRoles.Member, UserRoles.Admin, UserRoles.SuperAdmin] }),
  ArticleController.getArticleHeaderTypes,
);

router.get(
  '/:articleId',
  authenticate,
  protectedRequirements({ roles: [UserRoles.Member, UserRoles.Admin, UserRoles.SuperAdmin] }),
  ArticleController.getArticleById,
);

router.put(
  '/:articleId',
  authenticate,
  protectedRequirements({ roles: [UserRoles.Member, UserRoles.Admin, UserRoles.SuperAdmin] }),
  ArticleController.updateArticle,
);

router.post(
  '/',
  authenticate,
  protectedRequirements({ roles: [UserRoles.Member, UserRoles.Admin, UserRoles.SuperAdmin] }),
  ArticleController.createArticle,
);

export default router;
