export interface IPersonaCreateAccountBody {
  data: {
    'attributes': {
      'ref-id'?: string; // 'ref-id': 'KW internal user id or visitor id
      'country-code': string;
      'social-security-number': string;
      'name-first': string;
      'name-last': string;
      'phone-number': string;
      'birthdate': string; // 'YYYY-MM-DD'
      'email-address': string;
      'address-street-1': string;
      'address-street-2'?: string;
      'address-city': string;
      'address-subdivision': string;
      'address-postal-code': string;
    }
  }
}

// revist this should be page object and filter object
export interface IPersonaAccountsRequest {
  size?: string;
  before?: string;
  after?: string;
}
