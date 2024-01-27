export const validatePassword = (password: string) => {
  if (password.length < 8) {
    return { valid: false, errorType: 'length', message: 'Please provide a password at least 8 characters long.' };
  } if (!/[A-Z]+/.test(password)) {
    return { valid: false, errorType: 'uppercase', message: 'Please provide a password containing at least 1 uppercase letter.' };
  } if (!/[a-z]+/.test(password)) {
    return { valid: false, errorType: 'lowercase', message: 'Please provide a password containing at least 1 lowercase letter.' };
  } if (!/[0-9]+/.test(password)) {
    return { valid: false, errorType: 'number', message: 'Please provide a password containing at least 1 number.' };
  } if (!/[@$!%*?&-]+/.test(password)) {
    return { valid: false, errorType: 'special', message: 'Please provide a password containing at least 1 special character (@$!%*?&).' };
  }
  return { valid: true, errorType: null, message: 'Password Valid' };
};

export const isValidPassword = (password: string) => validatePassword(password).valid;

export const validatePhoneNumber = (phone: string) => {
  const phonePattern = /^(\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/i;
  if (!phonePattern.test(phone)) {
    return { valid: false, message: 'Please provide a valid 10 digit phone number.' };
  }
  return { valid: true, message: 'Phone Number Valid' };
};

export const isvalidPhoneNumber = (phone: string) => validatePhoneNumber(phone).valid;
