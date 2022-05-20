import { IUnsdgDocument, UnsdgModel } from '../../models/unsdg';
import { IUnsdgCategory, IUnsdgCategoryDocument, UnsdgCategoryModel } from '../../models/unsdgCategory';
import { IUnsdgSubcategory, IUnsdgSubcategoryDocument, UnsdgSubcategoryModel } from '../../models/unsdgSubcategory';

export const getUnsdgs = async () => {
  try {
    const unsdgs = await UnsdgModel
      .find({})
      .sort({ goalNum: 1 })
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
    return {
      error: 'An error occurred while trying to retrieve the UNSDGs.',
      code: 400,
    };
  }
};

export const getShareableCategory = ({
  name,
  index,
  createdOn,
  lastModified,
}: IUnsdgCategoryDocument): IUnsdgCategory => ({
  name,
  index,
  createdOn,
  lastModified,
});

export const getShareableSubCategory = ({
  name,
  category,
  categoryIndex,
  createdOn,
  lastModified,
}: IUnsdgSubcategoryDocument): IUnsdgSubcategory => {
  const _category = (!!category && Object.values(category).length)
    ? getShareableCategory(category as IUnsdgCategoryDocument)
    : category;

  return {
    name,
    category: _category,
    categoryIndex,
    createdOn,
    lastModified,
  };
};

export const getShareableUnsdg = ({
  title,
  subCategory,
  subCategoryIndex,
  goalNum,
  img,
  sourceUrl,
  description,
  subTitle,
  howToAcquire,
  createdOn,
  lastModified,
}: IUnsdgDocument) => {
  const _subCategory = (!!subCategory && Object.values(subCategory).length)
    ? getShareableSubCategory(subCategory as IUnsdgSubcategoryDocument)
    : subCategory;

  return {
    title,
    subCategory: _subCategory,
    subCategoryIndex,
    goalNum,
    img,
    sourceUrl,
    description,
    subTitle,
    howToAcquire,
    createdOn,
    lastModified,
  };
};
