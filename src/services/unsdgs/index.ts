import pino from 'pino';
import { UnsdgModel } from '../../mongo/model/unsdg';
import { UnsdgCategoryModel } from '../../mongo/model/unsdgCategory';
import { UnsdgSubcategoryModel } from '../../mongo/model/unsdgSubcategory';

const logger = pino();

export const getUnsdgs = async () => {
  try {
    const unsdgs = await UnsdgModel
      .find({})
      .populate({
        path: 'subCategory',
        model: UnsdgSubcategoryModel,
        populate: {
          path: 'category',
          model: UnsdgCategoryModel,
        },
      });

    if (!unsdgs.length) {
      return {
        error: 'UNSDGs not found.',
        code: 404,
      };
    }

    return unsdgs;
  } catch (err) {
    logger.error(err);
    return {
      error: 'An error occurred while trying to retrieve the UNSDGs.',
      code: 400,
    };
  }
};
