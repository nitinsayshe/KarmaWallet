import {
  ObjectId,
  Schema,
  model,
  PaginateModel,
  Document,
} from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import { IModel, IRef } from '../types/model';
import { ICompany } from './company';
import { IValue } from './value';

export enum ValueCompanyAssignmentType {
  DataSourceInherited = 'dataSourceInherited',
  DirectAssignment = 'directAssignment',
}

export enum ValueCompanyWeightMultiplier {
  DataSource = 1,
  DirectAssign = 1000,
}

export interface IValueCompanyMapping {
  assignmentType: ValueCompanyAssignmentType;
  company: IRef<ObjectId, ICompany>;
  exclude: boolean;
  value: IRef<ObjectId, IValue>;
  weightMultiplier: ValueCompanyWeightMultiplier;
}

export interface IValueCompanyMappingDocument extends IValueCompanyMapping, Document {}
export type IValueCompanyMappingModel = IModel<IValueCompanyMapping>;

const valueCompanyMappingSchema = new Schema({
  assignmentType: {
    type: String,
    required: true,
    enum: Object.values(ValueCompanyAssignmentType),
  },
  company: {
    type: Schema.Types.ObjectId,
    ref: 'company',
    required: true,
  },
  exclude: {
    type: Boolean,
    default: false,
  },
  /**
   * weight will depend on how the value was assigned to the company.
   * if a company inherits the value from a data source, the weight should
   * be whatever the value's default is. But a value directly assigned
   * to a company should have a higher weight, so it will have a multipler
   * to ensure this weight is increased enough to always be higher.
   */
  weightMultiplier: {
    type: Number,
    required: true,
    enum: {
      values: Object.values(ValueCompanyWeightMultiplier),
      message: 'Invalid weight multiplier',
    },
  },
  value: {
    type: Schema.Types.ObjectId,
    ref: 'value',
    required: true,
  },
});
valueCompanyMappingSchema.plugin(mongoosePaginate);

export const ValueCompanyMappingModel = model<IValueCompanyMappingDocument, PaginateModel<IValueCompanyMapping>>('value_company_mapping', valueCompanyMappingSchema);
