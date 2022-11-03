import { CompanyModel } from '../../models/company';
import { CompanyDataSourceModel } from '../../models/companyDataSource';
import { ValueCompanyAssignmentType, ValueCompanyMappingModel, ValueCompanyWeightMultiplier } from '../../models/valueCompanyMapping';
import { ValueDataSourceMappingModel } from '../../models/valueDataSourceMapping';

export const mapValuesToCompanies = async () => {
  console.log('mapping values to companies...');
  const companies = await CompanyModel.find({});
  let count = 0;

  for (const company of companies) {
    const companyValues = await ValueCompanyMappingModel.find({ company });
    const companyDataSources = await CompanyDataSourceModel.find({ company, status: { $gt: 0 } });

    for (const companyDataSource of companyDataSources) {
      const mapping = await ValueDataSourceMappingModel.findOne({ dataSource: companyDataSource.source });

      if (!mapping) continue;

      const companyValue = companyValues.find(v => v.value.toString() === mapping.value.toString());

      if (!!companyValue && companyValue.weightMultiplier !== ValueCompanyWeightMultiplier.DataSource) continue;

      try {
        if (!!companyValue) {
          companyValue.weightMultiplier = ValueCompanyWeightMultiplier.DataSource;
          companyValue.value = mapping.value;
          await companyValue.save();
        } else {
          const newCompanyValue = new ValueCompanyMappingModel({
            assignmentType: ValueCompanyAssignmentType.DataSourceInherited,
            company,
            value: mapping.value,
            weightMultiplier: ValueCompanyWeightMultiplier.DataSource,
          });

          await newCompanyValue.save();
        }

        count += 1;
      } catch (err) {
        console.log('[-] error saving company value mapping');
        console.log(err);
        continue;
      }
    }
  }

  console.log(`[+] ${count} value to company mappings created successfully`);
};
