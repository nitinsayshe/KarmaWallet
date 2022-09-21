/* eslint-disable camelcase */
import dayjs from 'dayjs';
import { WildfireClient } from '../clients/wildfire';
import { sleep } from '../lib/misc';
import { IWildfireCommission, mapWildfireCommissionToKarmaCommission } from '../services/commission/utils';

/**
 * pulls all wildfire commissions and upserts them into the database
 */

interface IRecursivelyGetAllCommissionsParams {
  startDate: string,
  endDate: string,
  cursor?: string,
  commissions: IWildfireCommission[],
}

// https://documenter.getpostman.com/view/24961/RWgqVyV2#8f2e76c4-c435-477a-aa33-05091e623bae
// IMPORTANT: This endpoint has a rate limit of 1 request per 5 seconds.
const recursivelyGetAllCommissions = async ({
  startDate,
  endDate,
  cursor,
  commissions,
}: IRecursivelyGetAllCommissionsParams): Promise<IWildfireCommission[]> => {
  const wildfireClient = new WildfireClient();
  const { data } = await wildfireClient.getAdminComissionDetails({ startDate, endDate, cursor });
  cursor = data?.NextCursor;
  commissions = [...commissions, ...data.Commissions];
  if (!cursor) return commissions;
  await sleep(5500);
  return recursivelyGetAllCommissions({ startDate, endDate, cursor, commissions });
};

export const exec = async () => {
  console.log('[#] running wildfire commissions update job');
  let errorCount = 0;
  const date = dayjs();
  const startDate = date.subtract(1, 'month').format('YYYY-MM-DD');
  const endDate = date.format('YYYY-MM-DD');
  const commissions = await recursivelyGetAllCommissions({ startDate, endDate, cursor: '', commissions: [] });
  for (const commission of commissions) {
    try {
      await mapWildfireCommissionToKarmaCommission(commission);
    } catch (err: any) {
      console.log(`[-] error mapping commission to karma commission: ${err.message}`);
      errorCount += 1;
    }
  }
  const msg = `[#] successfully updated ${commissions.length} wildfire commissions with ${errorCount} errors`;
  console.log(msg);
  return msg;
};
