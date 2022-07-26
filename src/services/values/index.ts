import { isValidObjectId, Types } from 'mongoose';
import { ErrorTypes } from '../../lib/constants';
import CustomError, { asCustomError } from '../../lib/customError';
import { IUnsdgCategoryDocument, UnsdgCategoryModel } from '../../models/unsdgCategory';
import { IValueDocument, ValueModel } from '../../models/value';
import { IValueCompanyMappingDocument, ValueCompanyAssignmentType, ValueCompanyMappingModel, ValueCompanyWeightMultiplier } from '../../models/valueCompanyMapping';
import { IRequest } from '../../types/request';
import { Logger } from '../logger';
import { getShareableCategory } from '../unsdgs';

export interface IGetCompanyValuesRequestQuery {
  companyId: string;
}

export interface IUpdateCompanyValuesRequestBody {
  valuesToAdd: string[];
  valuesToExclude: string[];
}

export interface IUpdateCompanyValuesRequestParams {
  companyId: string;
}

export const getCompanyValues = async (req: IRequest<{}, IGetCompanyValuesRequestQuery>) => {
  const { companyId } = req.query;

  if (!companyId) throw new CustomError('A companyId is required', ErrorTypes.INVALID_ARG);
  if (!isValidObjectId(companyId)) throw new CustomError('Invalid companyId', ErrorTypes.INVALID_ARG);

  try {
    const mappings = await ValueCompanyMappingModel
      .find({ company: companyId })
      .populate([
        {
          path: 'value',
          model: ValueModel,
          populate: [
            {
              path: 'category',
              model: UnsdgCategoryModel,
            },
          ],
        },
      ]);

    // extract values from mappings and sort
    const values = mappings
      .map(mapping => {
        (mapping.value as IValueDocument).weight *= mapping.weightMultiplier;
        return mapping.value;
      })
      .sort((a, b) => (b as IValueDocument).weight - (a as IValueDocument).weight);

    // remove duplicate values
    const uniqueValues: IValueDocument[] = [];
    const uniqueValueIds = new Set();

    for (const value of values) {
      if (!uniqueValueIds.has((value as IValueDocument)._id.toString())) {
        uniqueValueIds.add((value as IValueDocument)._id.toString());
        uniqueValues.push(value as IValueDocument);
      }
    }

    return uniqueValues;
  } catch (err) {
    throw asCustomError(err);
  }
};

export const getShareableCompanyValue = ({
  category,
  name,
  weight,
}: IValueDocument) => {
  const _category = (!!category && Object.values(category).length)
    ? getShareableCategory(category as IUnsdgCategoryDocument)
    : category;

  return {
    category: _category,
    name,
    weight,
  };
};

export const updateCompanyValues = async (req: IRequest<IUpdateCompanyValuesRequestParams, {}, IUpdateCompanyValuesRequestBody>) => {
  const { companyId } = req.params;
  const { valuesToAdd = [], valuesToExclude = [] } = req.body;

  if (!companyId) throw new CustomError('A company id is required', ErrorTypes.INVALID_ARG);
  if (!isValidObjectId(companyId)) throw new CustomError(`Invalid company id: ${companyId}`, ErrorTypes.INVALID_ARG);

  const invalidValuesToAdd = valuesToAdd.filter(value => !isValidObjectId(value));
  const invalidValuesToExclude = valuesToExclude.filter(value => !isValidObjectId(value));

  if (!!invalidValuesToAdd.length) {
    throw new CustomError(`Invalid value id${invalidValuesToAdd.length > 1 ? 's' : ''} found: ${invalidValuesToExclude.join(', ')}`, ErrorTypes.INVALID_ARG);
  }

  if (!!invalidValuesToExclude.length) {
    throw new CustomError(`Invalid value id${invalidValuesToExclude.length > 1 ? 's' : ''} found: ${invalidValuesToExclude.join(', ')}`, ErrorTypes.INVALID_ARG);
  }

  try {
    // reset all company values that have previously
    // been assigned to this company
    await ValueCompanyMappingModel.deleteMany({ company: companyId, weightMultiplier: ValueCompanyWeightMultiplier.DirectAssign });
  } catch (err) {
    Logger.error(asCustomError(err));
    throw new CustomError('Error clearing previous company values.', ErrorTypes.SERVER);
  }

  let values: IValueDocument[];

  try {
    // retrieve all values that were passed
    values = await ValueModel.find({ _id: { $in: [...valuesToAdd, ...valuesToExclude] } });
  } catch (err) {
    Logger.error(asCustomError(err));
    throw new CustomError('Error retrieving values.', ErrorTypes.SERVER);
  }

  if (!values.length) throw new CustomError('None of the provided values were found.', ErrorTypes.NOT_FOUND);

  // create new mappings for each value passed in
  const newValues: Promise<IValueCompanyMappingDocument>[] = [];

  for (const valueTo of [...valuesToAdd, ...valuesToExclude]) {
    const value = values.find(v => v._id.toString() === valueTo);

    const newCompanyValue = new ValueCompanyMappingModel({
      assignmentType: ValueCompanyAssignmentType.DirectAssignment,
      company: new Types.ObjectId(companyId),
      exclude: valuesToExclude.includes(valueTo),
      weightMultiplier: ValueCompanyWeightMultiplier.DirectAssign,
      value,
    });

    newValues.push(newCompanyValue.save());
  }

  try {
    await Promise.all(newValues);
  } catch (err) {
    Logger.error(asCustomError(err));
    throw new CustomError('Error saving new company values.', ErrorTypes.SERVER);
  }

  // return the new values
  return getCompanyValues({
    ...req,
    params: {},
    query: { companyId },
  });
};
