import fs from 'fs';
import csvtojson from 'csvtojson';
import path from 'path';
import { CompanyModel, ICompanyDocument } from '../../models/company';

type MCCMappingRow = {
  mcc: number;
  description: string;
  company: string;
};

export const addCompanyMCCCodes = async (inputFilePath?: string): Promise<ICompanyDocument[]> => {
  try {
    let mappingsRaw: string;
    if (!inputFilePath) {
      mappingsRaw = fs.readFileSync(
        path.resolve(__dirname, './.tmp/MCC_Company_Mappings.csv'),
        'utf8',
      );
    } else {
      mappingsRaw = fs.readFileSync(
        path.resolve(__dirname, inputFilePath),
        'utf8',
      );
    }

    const mappings: MCCMappingRow[] = (await csvtojson().fromString(mappingsRaw) as MCCMappingRow[]);
    if (!mappings) {
      throw new Error('No search results found');
    }

    console.log(`starting to set ${mappings.length} companies' mcc codes`);
    const companies = await Promise.all(
      mappings.map(async (mapping) => {
        // get the company
        const company = await CompanyModel.findById(mapping.company);
        if (!company) {
          throw new Error('No company found');
        }
        console.log(`setting mcc code: ${mapping.mcc} for ${company.companyName}`);
        company.mcc = mapping.mcc;
        return company.save();
      }),
    );
    return companies || [];
  } catch (err) {
    console.error('Error adding MCC codes to companies');
    console.error(err);
    return [];
  }
};
