export const checkEmail = (email: string) => {
  const regex = /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/;
  return regex.test(email);
};

export const checkPassword = (password: string) => {
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return regex.test(password);
};

export const passwordChecks = (password: string) => {
  if (password.length < 8) {
    return { valid: false, errorType: 'length', message: 'Please provide a password at least 8 characters long.' };
  } if (!/[A-Z]+/.test(password)) {
    return { valid: false, errorType: 'uppercase', message: 'Please provide a password containing at least 1 uppercase letter.' };
  } if (!/[a-z]+/.test(password)) {
    return { valid: false, errorType: 'lowercase', message: 'Please provide a password containing at least 1 lowercase letter.' };
  } if (!/[0-9]+/.test(password)) {
    return { valid: false, errorType: 'number', message: 'Please provide a password containing at least 1 number.' };
  } if (!/[@$!%*?&]+/.test(password)) {
    return { valid: false, errorType: 'special', message: 'Please provide a password containing at least 1 special character (@$!%*?&).' };
  }
  return { valid: true, errorType: null, message: 'Password Valid' };
};

export default { checkEmail, checkPassword, passwordChecks };
