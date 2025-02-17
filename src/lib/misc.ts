import { ObjectId } from 'mongoose';
import { ErrorTypes } from './constants';
import CustomError from './customError';
import { getRandom } from './number';

export const getSample = <T extends object & { _id: ObjectId }>(documents: T[], sampleSize: number): T[] => {
  const unique = [...documents];
  const samples: T[] = [];

  if (!documents?.length) throw new CustomError('No documents found, so unable to provide sample.', ErrorTypes.SERVICE);
  if (documents.length < sampleSize) throw new CustomError(`Not enough documents received to provide sample of size: ${sampleSize}.`, ErrorTypes.SERVICE);

  do {
    const rand = getRandom(0, unique.length - 1);
    samples.push(unique[rand]);
    unique.splice(rand, 1);
  } while (samples.length < sampleSize);

  return samples;
};

export const sleep = (delay: number) => new Promise((resolve) => {
  setTimeout(() => resolve(null), delay);
});

export const roundToPercision = (value: number, precision: number) => {
  const multiplier = 10 ** (precision || 0);
  return Math.round(value * multiplier) / multiplier;
};

export const generateRandomPasswordString = (length: number) => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return `K4-${password}!`;
};

export const floorToPercision = (value: number, precision: number) => {
  const multiplier = 10 ** (precision || 0);
  return Math.floor(value * multiplier) / multiplier;
};

export const formatName = (str: string) => {
  const words = str.split(' ');
  const formattedWords = words.map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
  const formattedStr = formattedWords.join(' ');
  return formattedStr;
};
