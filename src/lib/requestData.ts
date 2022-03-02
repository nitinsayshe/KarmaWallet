export const allowFields = (allowedFieldsArray: string[], inputObject: { [key: string]: any }) => allowedFieldsArray.reduce((acc, allowedField) => {
  if (inputObject?.[allowedField]) {
    (acc as any)[allowedField] = inputObject[allowedField];
  }
  return acc;
}, {});

export const verifyRequiredFields = (requiredFieldsArray: string[] = [], inputObject: { [key: string]: any } = {}) => requiredFieldsArray.reduce((acc, requiredField) => {
  if (!(requiredField in inputObject)) {
    acc.isValid = false;
    acc.missingFields.push(requiredField);
  }
  return acc;
}, { isValid: true, missingFields: [] });
