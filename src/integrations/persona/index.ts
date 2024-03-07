import dayjs from 'dayjs';
import { ICreateKarmaCardApplicantData } from '../../services/karmaCard/utils';
import { IPersonaCreateAccountBody } from './types';

// refId can be KW internal user id or visitor id
export const buildPersonaCreateAccountBody = (params: ICreateKarmaCardApplicantData, refId?: string) => {
  const personaData: IPersonaCreateAccountBody = {
    data: {
      attributes: {
        'country-code': 'US',
        'social-security-number': params.ssn,
        'name-first': params.firstName,
        'name-last': params.lastName,
        birthdate: dayjs(params.birthDate).format('YYYY-MM-DD'), // 'YYYY-MM-DD
        'phone-number': params.phone,
        'email-address': params.email,
        'address-street-1': params.address1,
        'address-city': params.city,
        'address-subdivision': params.state,
        'address-postal-code': params.postalCode,
      },
    },
  };

  if (!!refId) personaData.data.attributes['ref-id'] = refId;
  if (!!params.address2) personaData.data.attributes['address-street-2'] = params.address2;
  return personaData;
};
