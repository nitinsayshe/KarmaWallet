import CompanyModel from '../../mongo/model/company';
import { IRequest } from '../../types/request';

export const findByIdAndUpdate = async (req: IRequest, uid: string, updates) => {
  const updatedUser = await CompanyModel.findByIdAndUpdate(uid, { ...updates, lastModified: new Date() }, { new: true });
  return updatedUser;
};

export const findOneAndUpdate = async (req: IRequest, query, updates) => {
  const updatedUser = await CompanyModel.findOneAndUpdate(query, { ...updates, lastModified: new Date() }, { new: true });
  return updatedUser;
};

export const listCompanies = async (req: IRequest) => {
  const transactions = [];
  return transactions;
};


const ServiceMethod = ()