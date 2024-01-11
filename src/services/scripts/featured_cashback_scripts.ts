import { CashbackCompanyDisplayLocation, CompanyModel } from '../../models/company';
import { MerchantModel } from '../../models/merchant';

export enum IKarmaCollectiveAction {
  ADD = 'add',
  REMOVE = 'remove',
}

export interface IFeaturedCashbackCompanyUpdate {
  id: string;
  locations: CashbackCompanyDisplayLocation[];
}

export interface IKarmaCollectiveCompanyToUpdate {
  id: string;
  action: IKarmaCollectiveAction;
}

export const updateKarmaCollectiveMembers = async (companiesToUpdate: IKarmaCollectiveCompanyToUpdate[]) => {
  for (const company of companiesToUpdate) {
    const companyData = await CompanyModel.findById(company.id);

    if (!companyData) {
      console.log(`Company ${company.id} not found`);
      continue;
    }

    const merchantId = companyData.merchant;

    if (!merchantId) {
      console.log(`Merchant not found for company ${company.id}`);
      continue;
    }

    const merchant = await MerchantModel.findById(merchantId);
    if (!merchant) {
      console.log(`Merchant not found for company ${company.id}`);
      continue;
    }

    if (company.action === IKarmaCollectiveAction.REMOVE) {
      merchant.karmaCollectiveMember = false;
    } else {
      merchant.karmaCollectiveMember = true;
    }

    await merchant.save();
  }
};

export const addFeaturedCashbackToCompany = async (companiesToUpdate: IFeaturedCashbackCompanyUpdate[]) => {
  for (const c of companiesToUpdate) {
    const company = await CompanyModel.findById(c.id);
    if (!company) {
      console.log(`Company ${c} not found`);
      continue;
    }

    company.featuredCashback = {
      status: true,
      location: c.locations,
    };

    await company.save();
  }
};
