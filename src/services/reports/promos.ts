import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { CardStatus, ErrorTypes } from '../../lib/constants';
import CustomError, { asCustomError } from '../../lib/customError';
import { CardModel } from '../../models/card';
import { IPromoDocument, PromoModel } from '../../models/promo';
import { UserModel } from '../../models/user';
import { IRequest } from '../../types/request';
import { IReportRequestParams, IReportRequestQuery, ReportType } from './utils/types';

dayjs.extend(utc);

interface IAggData {
  total: number;
  promo: string;
}

export interface IAccountStatusAggData extends IAggData {
  linked: number;
  notLinked: number; // includes removed and never linked
}
export interface ISourceAggData extends IAggData {
  sources?: { [key: string]: number };
}
export interface ICampaignAggData extends IAggData {
  campaigns?: { [key: string]: number };
}

const getAllPromos = async (): Promise<IPromoDocument[]> => {
  let promos: IPromoDocument[] = [];
  try {
    promos = (await PromoModel.find({}).sort({ startDate: 1 })) || [];
  } catch (err) {
    throw new CustomError('Error getting promos.', ErrorTypes.SERVER);
  }
  return promos;
};

const getPromoUsersByCampaign = async (): Promise<{ data: ICampaignAggData[] }> => {
  // get list of all promos
  const promos = await getAllPromos();
  // normalize to lowercase and merge any duplicates
  if (!promos.length) {
    return { data: [] };
  }
  // for each promo, get list of users in the promo
  const promoUsers = await Promise.all(
    promos.map(async (promo) => {
      const users = await UserModel.find({ 'integrations.promos': promo._id });
      return { promo: promo.name, users };
    }),
  );

  const data: ICampaignAggData[] = [];
  promoUsers.forEach((promoUser) => {
    const { promo, users } = promoUser;
    const campaignData: { [key: string]: number } = {};
    users.forEach((user) => {
      if (user.integrations?.referrals?.params?.length > 0) {
        let campaigns = user.integrations?.referrals?.params.filter((p) => p.key === 'utm_campaign');
        // normalize to lowercase and merge any duplicates
        campaigns = campaigns.map((c) => ({ ...c, value: c.value.toLowerCase().trim() }));
        for (const campaign of campaigns) {
          if (campaignData[campaign.value]) {
            campaignData[campaign.value]++;
          } else {
            campaignData[campaign.value] = 1;
          }
        }
      }
    });
    data.push({ total: users.length, promo, campaigns: campaignData });
  });

  return { data };
};

const getPromoUsersBySource = async (): Promise<{ data: ISourceAggData[] }> => {
  // get list of all promos
  const promos = await getAllPromos();
  // normalize to lowercase and merge any duplicates
  if (!promos.length) {
    return { data: [] };
  }
  // for each promo, get list of users in the promo
  const promoUsers = await Promise.all(
    promos.map(async (promo) => {
      const users = await UserModel.find({ 'integrations.promos': promo._id });
      return { promo: promo.name, users };
    }),
  );

  const data: ISourceAggData[] = [];
  promoUsers.forEach((promoUser) => {
    const { promo, users } = promoUser;
    const sourceData: { [key: string]: number } = {};
    users.forEach((user) => {
      if (user.integrations?.referrals?.params?.length > 0) {
        let sources = user.integrations?.referrals?.params.filter((p) => p.key === 'utm_source');
        // normalize to lowercase and merge any duplicates
        sources = sources.map((s) => ({ ...s, value: s.value.toLowerCase().trim() }));
        for (const source of sources) {
          if (sourceData[source.value]) {
            sourceData[source.value]++;
          } else {
            sourceData[source.value] = 1;
          }
        }
      }
    });
    data.push({ total: users.length, promo, sources: sourceData });
  });

  return { data };
};

const getPromoUsersByAccountStatus = async (): Promise<{ data: IAccountStatusAggData[] }> => {
  // get list of all promos
  const promos = await getAllPromos();
  // normalize to lowercase and merge any duplicates
  if (!promos.length) {
    return { data: [] };
  }
  // for each promo, get list of users in the promo
  const promoUsers = await Promise.all(
    promos.map(async (promo) => {
      const users = await UserModel.find({ 'integrations.promos': promo._id });
      return { promo: promo.name, users, startDate: promo.startDate };
    }),
  );

  let data: (IAccountStatusAggData & { promoStartDate: Date })[] = [];
  await Promise.all(
    promoUsers.map(async (promoUser) => {
      const { promo, users } = promoUser;
      let linked = 0;
      linked = (
        await CardModel.aggregate()
          .match({ userId: { $in: users.map((u) => u._id) }, status: CardStatus.Linked })
          .group({ _id: '$userId' })
      ).length || 0;
      data.push({
        total: users.length,
        promo,
        linked,
        notLinked: users.length - linked,
        promoStartDate: promoUser.startDate,
      });
    }),
  );

  data = data.sort((a, b) => {
    // if a date is null, set it to 1970-01-01 so it will be sorted to the top
    if (!a.promoStartDate) {
      a.promoStartDate = new Date('1970-01-01');
    }
    if (!b.promoStartDate) {
      a.promoStartDate = new Date('1970-01-01');
    }
    return dayjs(a.promoStartDate).diff(dayjs(b.promoStartDate));
  });
  data = data.map((d) => {
    delete d.promoStartDate;
    return d;
  });

  return { data };
};

export const getPromosReport = async (
  req: IRequest<IReportRequestParams, IReportRequestQuery>,
): Promise<{ data: IAggData[] }> => {
  const { reportId } = req.params;
  try {
    switch (reportId) {
      case ReportType.PromoUsersByAccountStatus:
        return getPromoUsersByAccountStatus();
      case ReportType.PromoUsersByCampaign:
        return getPromoUsersByCampaign();
      case ReportType.PromoUsersBySource:
        return getPromoUsersBySource();
      default:
        throw new Error('Invalid report id found.');
    }
  } catch (err) {
    throw asCustomError(err);
  }
};
