import { sleep } from '../../lib/misc';
import { PaginatedMarqetaResponse } from './types';

export type GetPaginiatedResourceParams = Record<string, string>;
export const getMarqetaResources = async <ResourceType>(
  queryParams: GetPaginiatedResourceParams,
  getResourceFunction: (queryParams: Record<string, string>) => Promise<PaginatedMarqetaResponse<ResourceType[]>>, // this function needs to initialize the marqeta client
): Promise<ResourceType[]> => {
  let resources: ResourceType[] = [];
  let moreResources = true;
  let startIndex = 0;
  while (moreResources) {
    try {
      const resourceBatch = await getResourceFunction({
        ...queryParams,
        startIndex: startIndex.toString(),
      });
      moreResources = resourceBatch.is_more;
      if (startIndex === resourceBatch.end_index + 1) {
        throw new Error('Marqeta is returning the same batch of transactions');
      }
      startIndex = resourceBatch.end_index + 1;
      resources = [...resources, ...resourceBatch.data];
    } catch (err) {
      console.log(err);
      moreResources = false;
    }
    await sleep(1000);
  }
  return resources;
};
