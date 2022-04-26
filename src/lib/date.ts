import {
  addMonths,
  addDays,
  addMinutes,
  addHours,
  addYears,
} from 'date-fns';

export interface IGetDateFromData {
  months?: string | number;
  days?: string | number;
  hours?: string | number;
  minutes?: string | number;
  years?: string | number;
  startDate?: string;
}

export const isValidDate = (dateObj: Date) => dateObj instanceof Date && !Number.isNaN(dateObj.valueOf());

export const getDateFrom = ({
  months,
  days,
  hours,
  minutes,
  years,
  startDate,
}: IGetDateFromData) => {
  const controlledMonths = parseInt(`${months}`, 10);
  const controlledDays = parseInt(`${days}`, 10);
  const controlledYears = parseInt(`${years}`, 10);
  const controlledMinutes = parseInt(`${minutes}`, 10);
  const controlledHours = parseInt(`${hours}`, 10);
  let date = startDate ? new Date(startDate) : new Date();
  if (!isValidDate(date)) {
    date = new Date();
  }
  if (months && !Number.isNaN(controlledMonths)) {
    date = addMonths(date, controlledMonths);
  }
  if (days && !Number.isNaN(controlledDays)) {
    date = addDays(date, controlledDays);
  }
  if (minutes && !Number.isNaN(controlledMinutes)) {
    date = addMinutes(date, controlledMinutes);
  }
  if (years && !Number.isNaN(controlledYears)) {
    date = addYears(date, controlledYears);
  }
  if (hours && !Number.isNaN(controlledHours)) {
    date = addHours(date, controlledHours);
  }
  return date;
};

export const getDaysFromPreviousDate = (date: Date) => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  return Math.ceil(diff / (1000 * 3600 * 24));
};

export const toUTC = (date: Date) => new Date(
  date.getUTCFullYear(),
  date.getUTCMonth(),
  date.getUTCDate(),
  date.getUTCHours(),
  date.getUTCMinutes(),
  date.getUTCSeconds(),
);
