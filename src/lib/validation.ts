export const formatZodFieldErrors = (fieldErrors: { [key: string]: string[] }): string => {
  let error = '';
  Object.keys(fieldErrors).forEach((field, i) => {
    error += `${field}: ${fieldErrors[field].join(', ')}`;
    if (i !== Object.keys(fieldErrors).length - 1) error += '; ';
  });
  return error;
};
