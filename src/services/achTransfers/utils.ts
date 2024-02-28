import { NACHAACHReturnCodeEnumValues, NACHAACHReturnCodesEnum } from '../../integrations/marqeta/types';

export const mapACHReturnCode = (code: NACHAACHReturnCodeEnumValues) => NACHAACHReturnCodesEnum[code as keyof typeof NACHAACHReturnCodesEnum];
