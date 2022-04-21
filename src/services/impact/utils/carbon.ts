import { FilterQuery, Types } from 'mongoose';
import { convertKgToMT, formatNumber } from '../../../lib/number';
import { RareTransactionQuery } from '../../../lib/constants';
import { TransactionModel, ITransaction } from '../../../models/transaction';
import { MiscModel } from '../../../models/misc';

export enum EquivalencyKey {
  Airplane = 'airplane',
  Car = 'car',
  LightBulb = 'lightBulb',
  HomeElectricity = 'homeElectricity',
  HomeEnergy = 'homeEnergy',
  Sappling = 'sappling',
  Trees = 'trees',
  GarbageTruck = 'garbageTruck',
  Recycle = 'recycle',
  SmartPhone = 'smartPhone',
}

export enum EquivalencyObjectType {
  Monthly = 'monthly',
  Offsets = 'offsets',
  Total = 'total',
}

export enum EquivalencyType {
  Pos = 'positive',
  Neg = 'negative',
}

export interface IEquivalency {
  heading?: string;
  perMt: number;
  phrase(isPlural: boolean): string;
  source?: 'EPA';
  'EPA calculation': string;
  type: EquivalencyType,
  key: EquivalencyKey,
}

export interface IEquivalencyObject {
  text: string;
  icon: string;
  textNoQuantity: string;
  quantity: number;
  type?: EquivalencyObjectType;
}

export interface IEquivalencies {
  negative: IEquivalencyObject[];
  positive: IEquivalencyObject[];
}

// TODO: this should probably be stored in DB, but hard coding for now.
const equivalenciesData: IEquivalency[] = [
  {
    perMt: 2825,
    phrase: (isPlural: boolean) => `airline mile${isPlural ? 's' : ''}`,
    'EPA calculation': '0.471 mt for 1331 miles',
    type: EquivalencyType.Neg,
    key: EquivalencyKey.Airplane,
  },
  {
    heading: 'Greenhouse gas emissions from',
    perMt: 0.2173,
    phrase: (isPlural) => `passenger vehicle${isPlural ? 's' : ''} driven for one year`,
    source: 'EPA',
    'EPA calculation': '4.60 metric tons CO2E/vehicle /year',
    type: EquivalencyType.Neg,
    key: EquivalencyKey.Car,
  },
  {
    heading: 'Greenhouse gas emissions from',
    perMt: 2512.5628,
    phrase: (isPlural) => `mile${isPlural ? 's' : ''} driven by an average passenger vehicle`,
    source: 'EPA',
    'EPA calculation': '3.98 x 10-4 metric tons CO2E/mile',
    type: EquivalencyType.Neg,
    key: EquivalencyKey.Car,
  },
  {
    heading: 'Greenhouse gas emissions avoided by',
    perMt: 37.87878788,
    phrase: (isPlural) => `incandescent lamp${isPlural ? 's' : ''} switched to LEDs`,
    source: 'EPA',
    'EPA calculation': '2.64 x 10-2 metric tons CO2/bulb replaced',
    type: EquivalencyType.Pos,
    key: EquivalencyKey.LightBulb,
  },
  {
    heading: 'CO2 emissions from',
    perMt: 0.181653043,
    phrase: (isPlural) => `home${isPlural ? 's\'' : '\'s'} electricity use for one year`,
    source: 'EPA',
    'EPA calculation': '5.505 metric tons CO2/home.',
    type: EquivalencyType.Neg,
    key: EquivalencyKey.HomeElectricity,
  },
  {
    heading: 'CO2 emissions from',
    perMt: 0.120481928,
    phrase: (isPlural) => `home${isPlural ? 's\'' : '\'s'} energy use for one year`,
    source: 'EPA',
    'EPA calculation': '8.30 metric tons CO2 per home per year.',
    type: EquivalencyType.Neg,
    key: EquivalencyKey.HomeEnergy,
  },
  {
    heading: 'Carbon sequestered by',
    perMt: 16.66666667,
    phrase: (isPlural) => `tree seedling${isPlural ? 's' : ''} grown for 10 years`,
    source: 'EPA',
    'EPA calculation': '0.060 metric ton CO2 per urban tree planted',
    type: EquivalencyType.Pos,
    key: EquivalencyKey.Sappling,
  },
  {
    heading: 'Carbon sequestered by',
    perMt: 1.219512195,
    phrase: (isPlural) => `acre${isPlural ? 's' : ''} of U.S. forests in one year`,
    source: 'EPA',
    'EPA calculation': '-0.82 metric ton CO2/acre/year sequestered annually by one acre of average U.S. forest.',
    type: EquivalencyType.Pos,
    key: EquivalencyKey.Trees,
  },
  {
    heading: 'Greenhouse gas emissions avoided by',
    perMt: 0.048590865,
    phrase: (isPlural) => `garbage truck${isPlural ? 's' : ''} of waste recycled instead of landfilled`,
    source: 'EPA',
    'EPA calculation': '20.58 metric tons CO2E/garbage truck of waste recycled instead of landfilled',
    type: EquivalencyType.Neg,
    key: EquivalencyKey.GarbageTruck,
  },
  {
    heading: 'Greenhouse gas emissions avoided by',
    perMt: 42.55319149,
    phrase: (isPlural) => `trash bag${isPlural ? 's' : ''} of waste recycled instead of landfilled`,
    source: 'EPA',
    'EPA calculation': '2.35 x 10-2 metric tons CO2 equivalent/trash bag of waste recycled instead of landfilled',
    type: EquivalencyType.Neg,
    key: EquivalencyKey.Recycle,
  },
  {
    heading: 'CO2 emissions from',
    perMt: 121654.5012,
    phrase: (isPlural) => `smartphone${isPlural ? 's' : ''} charged`,
    source: 'EPA',
    'EPA calculation': '8.22 x 10-6 metric tons CO2/smartphone charged',
    type: EquivalencyType.Neg,
    key: EquivalencyKey.SmartPhone,
  },
];

export const buildCarbonMultiplierPipeline = (uid: string) => {
  const defaultProjection = {
    userId: 1,
    amount: 1,
    date: 1,
  };

  return TransactionModel.aggregate()
    .match({ userId: new Types.ObjectId(uid), carbonMultiplier: { $ne: null } })
    .lookup({
      from: 'plaid_category_mappings',
      localField: 'carbonMultiplier',
      foreignField: '_id',
      as: 'carbonMultiplier',
    })
    .project({
      ...defaultProjection,
      carbonMultiplier: {
        $map: {
          input: '$carbonMultiplier',
          as: 'multiplierObj',
          in: {
            carbonMultiplier: '$$multiplierObj.carbonMultiplier',
          },
        },
      },
    })
    .unwind('carbonMultiplier')
    .project({ ...defaultProjection, carbonMultiplier: '$carbonMultiplier.carbonMultiplier' });
};

export const getTotalEmissions = async (uid: string) => {
  // TODO: rewrite w/ new reference to plaid mapping
  const emissions = { kg: 0, mt: 0 };
  const sumTotal = await buildCarbonMultiplierPipeline(uid)
    .project({ userId: 1, emissions: { $multiply: ['$amount', '$carbonMultiplier'] } })
    .group({ _id: '$userId', amount: { $sum: '$emissions' } });

  if (sumTotal?.length) {
    const { amount } = sumTotal[0];
    emissions.kg = amount;
    emissions.mt = convertKgToMT(amount);
  }

  return emissions;
};

export const getMonthlyEmissionsAverage = async (uid: string) => {
  // TODO: rewrite w/ new reference to plaid mapping
  const emissions = { kg: 0, mt: 0 };
  const aggResult = await buildCarbonMultiplierPipeline(uid)
    .project({
      year: { $year: '$date' },
      month: { $month: '$date' },
      day: { $dayOfMonth: '$date' },
      _id: '$_id',
      emissions: { $multiply: ['$amount', '$carbonMultiplier'] },
    })
    .project({
      fingerprint: { $concat: [{ $toString: '$year' }, '-', { $toString: '$month' }] },
      emissions: '$emissions',
    })
    .group({
      _id: '$fingerprint',
      emissions: { $sum: '$emissions' },
    })
    .group({
      _id: null,
      monthlyAverage: { $avg: '$emissions' },
    });

  if (aggResult?.length) {
    const { monthlyAverage } = aggResult[0];
    emissions.kg = monthlyAverage;
    emissions.mt = convertKgToMT(monthlyAverage);
  }

  return emissions;
};

export const getEquivalencies = (metricTons: number, keySelector?: EquivalencyKey): IEquivalencies => equivalenciesData.reduce((acc, eq) => {
  const {
    perMt, phrase, type, key,
  } = eq;
  if (!keySelector || (keySelector === key)) {
    const quantity = Math.round(metricTons * perMt);
    if (quantity < 1) return acc;
    const isPlural = quantity > 1;
    const textNoQuantity = phrase(isPlural);
    const text = `${formatNumber(Math.round(quantity))} ${phrase(isPlural)}`;
    const obj = {
      text, icon: key, textNoQuantity, quantity,
    };
    acc[type].push(obj);
  }
  return acc;
}, { positive: [], negative: [] });

export const getOffsetTransactionsCount = (query: FilterQuery<ITransaction>) => TransactionModel.find({ ...RareTransactionQuery, ...query }).count();

export const getOffsetTransactions = (query: FilterQuery<ITransaction>) => TransactionModel.find({ ...RareTransactionQuery, ...query });

export const getOffsetTransactionsTotal = async (query: FilterQuery<ITransaction>): Promise<number> => {
  const aggResult = await TransactionModel.aggregate()
    .match({ ...RareTransactionQuery, ...query })
    .group({ _id: 'total', total: { $sum: '$integrations.rare.subtotal_amt' } });
  return aggResult?.length ? aggResult[0].total / 100 : 0;
};

export const countUsersWithOffsetTransactions = async (query: FilterQuery<ITransaction>) => {
  const aggResult = await TransactionModel.aggregate()
    .match({ ...RareTransactionQuery, ...query })
    .group({ _id: '$userId', total: { $sum: 1 } });
  return aggResult.length;
};

export const getRareOffsetAmount = async (query: FilterQuery<ITransaction>): Promise<number> => {
  const aggResult = await TransactionModel.aggregate()
    .match({ ...RareTransactionQuery, ...query })
    .group({ _id: 'total', total: { $sum: '$integrations.rare.tonnes_amt' } });
  return aggResult?.length ? aggResult[0].total : 0;
};

export const getRareDonationSuggestion = async (mtCarbon: number) => {
  const rareAverage = await MiscModel.findOne({ key: 'rare-project-average' }); // 13.81;
  const offsetAmount = mtCarbon * parseFloat(rareAverage.value);
  return Math.ceil(offsetAmount * 100) / 100;
};
