import fs from 'fs';
import path from 'path';
import { parse } from 'json2csv';
import { CompanyModel, ICompanyDocument } from '../../models/company';

export const generateChildParentCompanyRelsReport = async () => {
  const companies = await CompanyModel
    .find({})
    .populate([{
      path: 'parentCompany',
      model: CompanyModel,
    }]);

  const data = companies.map(c => ({
    companyId: c._id,
    companyName: c.companyName,
    parentId: (c.parentCompany as ICompanyDocument)?._id,
    parentName: (c.parentCompany as ICompanyDocument)?.companyName,
  }));

  const _data = parse(data);
  fs.writeFileSync(path.join(__dirname, '.tmp', 'child_parent_report.csv'), _data);
};
