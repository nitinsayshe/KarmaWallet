import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { asCustomError } from '../../lib/customError';
import { CardModel } from '../../models/card';
import { IChart } from '../../types/chart';
import { IRequest } from '../../types/request';
import { IReportRequestParams, IReportRequestQuery } from './utils/types';

dayjs.extend(utc);

export const getAccountTypesReport = async (_: IRequest<IReportRequestParams, IReportRequestQuery>): Promise<IChart> => {
  try {
    // get breakdown of cards added by subtype
    const aggData = await CardModel.aggregate()
      .group({ _id: '$subtype', count: { $sum: 1 }, type: { $first: '$subtype' } })
      .sort({ count: -1 });

    const data = aggData.map(d => ({
      label: d.type,
      values: [{ value: d.count }],
    }));

    return { data };
  } catch (err) {
    throw asCustomError(err);
  }
};
