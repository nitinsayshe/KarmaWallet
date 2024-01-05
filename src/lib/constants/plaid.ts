// These categories are excluded from certain calculations during transaction analysis
export const ExcludeCategories = [
  'Day Care and Preschools',
  'Government Departments and Agencies',
  'Libraries',
  'Newsstands',
  'Parking',
  'Payroll',
  'Public Transportation Services',
  'Rail',
  'Religious',
  'Tolls and Fees',
  'Real Estate',
  'Veterinarians',
  'Bank Fees',
  'Cash Advance',
  'Interest',
  'Payment',
  'Tax',
  'Transfer',
  'Churches',
  'Colleges and Universities',
  'Dentists',
  'Financial Planning and Investments',
  'Hospitals, Clinics and Medical Centers',
  'Primary and Secondary Schools',
];

export enum PlaidCompanyMatchType {
  MerchantName = 'merchant_name',
  Name = 'name',
}

export enum sourceDevice {
  android ='android',
  ios ='ios',
}

export const perTransferLimit = 2500;
export const dailyACHTransferLimit = 5000;
export const monthlyACHTransferLimit = 50000;
