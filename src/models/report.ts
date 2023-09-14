import { Schema, model, Document, Model } from 'mongoose';
import { getUtcDate } from '../lib/date';
import { IModel } from '../types/model';

export interface ITotalOffsetsForAllUsers {
  dollars: number;
  tons: number;
}

export interface ITransactionsMonitor {
  totalTransactions: number;
  missingCarbonMultiplier: number;
  missingCompany: number;
}

export interface IMultipleValueChartData {
  data: {
    label: string;
    values: { value: string }[];
  }[];
}

export interface IAdminSummary {
  users: {
    total: number;
    withCard: number;
    withoutCard: number;
    withUnlinkedCard: number;
    withRemovedCard: number;
    loggedInLastSevenDays: number;
    loggedInLastThirtyDays: number;
  };
  cards: {
    linked: {
      total: number;
      depository: number;
      credit: number;
    };
    unlinked: {
      total: number;
    };
    removed: {
      total: number;
    };
  };
  logins: {
    sevenDayTotal: number;
    thirtyDayTotal: number;
  };
  transactions: {
    total: number;
    totalDollars: number;
    totalExcludingCategories: number;
    totalDollarsExcludingCategories: number;
    matched: number;
    matchedExcludingCategories: number;
    matchedDollars: number;
    matchedDollarsExcludingCategories: number;
    matchedRatio: number;
    matchedRatioExcludingCategories: number;
    matchedDollarsRatio: number;
    matchedDollarsRatioExcludingCategories: number;
  };
  offsets: {
    total: number;
    dollars: number;
    tons: number;
  };
  commissions: {
    total: number;
    dollars: number;
    totalWildfire: number;
    totalWildfireDollars: number;
    totalKarmaWallet: number;
    totalKarmaWalletDollars: number;
    totalKard: number;
    totalKardDollars: number;
  };
  payouts: {
    pending: {
      total: number;
      marqeta: number;
      paypal: number;
      unknown: number;
    };
  };
}

export interface IReport {
  adminSummary?: IAdminSummary;
  totalOffsetsForAllUsers?: ITotalOffsetsForAllUsers;
  userHistory?: IMultipleValueChartData;
  userMetrics?: IMultipleValueChartData;
  createdOn: Date;
}

export interface IReportDocument extends IReport, Document {}
export type IReportModel = IModel<IReport>;

const userHistory = {
  type: {
    data: [
      {
        type: {
          label: String,
          values: [
            {
              type: {
                value: String,
              },
            },
          ],
        },
      },
    ],
  },
};

const userMetrics = {
  type: {
    data: [
      {
        type: {
          label: String,
          values: [
            {
              type: {
                value: String,
              },
            },
          ],
        },
      },
    ],
  },
};

const totalOffsetsForAllUsers = {
  type: {
    dollars: Number,
    tons: Number,
  },
};

const adminSummary = {
  users: {
    type: {
      total: Number,
      withCard: Number,
      withUnlinkedCard: Number,
      withRemovedCard: Number,
      withoutCard: Number,
      loggedInLastSevenDays: Number,
      loggedInLastThirtyDays: Number,
    },
  },
  cards: {
    type: {
      linked: {
        type: {
          total: Number,
          depository: Number,
          credit: Number,
        },
      },
      unlinked: {
        type: {
          total: Number,
        },
      },
      removed: {
        type: {
          total: Number,
        },
      },
    },
  },
  logins: {
    type: {
      sevenDayTotal: Number,
      thirtyDayTotal: Number,
    },
  },
  transactions: {
    type: {
      total: Number,
      totalDollars: Number,
      totalExcludingCategories: Number,
      totalDollarsExcludingCategories: Number,
      matched: Number,
      matchedExcludingCategories: Number,
      matchedDollars: Number,
      matchedDollarsExcludingCategories: Number,
      matchedRatio: Number,
      matchedRatioExcludingCategories: Number,
      matchedDollarsRatio: Number,
      matchedDollarsRatioExcludingCategories: Number,
    },
  },
  offsets: {
    type: {
      total: Number,
      dollars: Number,
      tons: Number,
    },
  },
  commissions: {
    type: {
      total: Number,
      dollars: Number,
      totalWildfire: Number,
      totalWildfireDollars: Number,
      totalKarmaWallet: Number,
      totalKarmaWalletDollars: Number,
      totalKard: Number,
      totalKardDollars: Number,
    },
  },
  payouts: {
    type: {
      pending: {
        type: {
          total: Number,
          pending: Number,
          marqeta: Number,
          paypal: Number,
        },
      },
    },
  },
};

const reportSchema = new Schema({
  adminSummary,
  totalOffsetsForAllUsers,
  userHistory,
  userMetrics,
  createdOn: { type: Date, default: () => getUtcDate() },
});

export const ReportModel = model<IReportDocument, Model<IReport>>('report', reportSchema);
