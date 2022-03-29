import { CachedDataKeys } from '../../lib/constants/cachedData';

export const getGroupOffsetDataKey = (groupId: string) => `${CachedDataKeys.GroupOffsetData}_${groupId}`;
