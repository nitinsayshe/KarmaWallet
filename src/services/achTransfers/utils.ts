import { NACHAACHReturnCodeEnumValues, NACHAACHReturnCodesEnum } from './types';

export const mapACHReturnCode = (code: NACHAACHReturnCodeEnumValues) => NACHAACHReturnCodesEnum[code as keyof typeof NACHAACHReturnCodesEnum];
