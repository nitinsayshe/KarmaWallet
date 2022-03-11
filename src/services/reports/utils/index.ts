export const getDaysInPast = (daysInPast: string, max = 365) => {
  let _daysInPast = parseInt(daysInPast);

  // if is an invalid number of days, do not throw
  // error, just default back to 30 days.
  if (Number.isNaN(_daysInPast)) _daysInPast = 30;

  // if the number of days is greater than
  // max, limit days in past
  // to max instead.
  if (_daysInPast > max) _daysInPast = max;

  return _daysInPast;
};
