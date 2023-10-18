import {
  addMonths,
  addDays,
  addMinutes,
  addHours,
  addYears,
} from 'date-fns';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import isBetween from 'dayjs/plugin/isBetween';

dayjs.extend(utc);
dayjs.extend(isBetween);

export interface IGetDateFromData {
  months?: string | number;
  days?: string | number;
  hours?: string | number;
  minutes?: string | number;
  years?: string | number;
  startDate?: string;
}

export const isValidDate = (dateObj: Date) => dateObj instanceof Date && !Number.isNaN(dateObj.valueOf());

export const getUtcDate = (date?: Date) => dayjs(date).utc(false);

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
  const then = dayjs(date);
  return dayjs().diff(then, 'days');
};

export const toUTC = (date: Date) => new Date(
  date.getUTCFullYear(),
  date.getUTCMonth(),
  date.getUTCDate(),
  date.getUTCHours(),
  date.getUTCMinutes(),
  date.getUTCSeconds(),
);

export const areMoreThanOneDayApart = (date1: Date, date2: Date): boolean => {
  const msBetweenDates = Math.abs(date1.getTime() - date2.getTime());
  // convert ms to hours                      min  sec   ms
  const hoursBetweenDates = msBetweenDates / (60 * 60 * 1000);
  return hoursBetweenDates >= 24;
};

export const inDateRange = (endDate: Date, startDate: Date) => {
  const currentDate = dayjs().utc();
  return currentDate.isBetween(dayjs(startDate), dayjs(endDate));
};

export const extractYearAndMonth = (dateString: Date) => {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  return { year, month };
};
