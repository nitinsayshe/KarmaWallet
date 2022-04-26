import { ObjectId } from 'mongoose';
import { getRandom } from './number';

export const getSample = <T extends object & { _id: ObjectId }>(documents: T[], sampleSize: number): T[] => {
  const dups = new Set();
  const samples: T[] = [];

  do {
    const rand = getRandom(0, documents.length - 1);
    const doc = documents[rand];
    if (!dups.has(doc._id.toString())) samples.push(doc);
  } while (samples.length < sampleSize);

  return samples;
};

export const sleep = (delay: number) => new Promise((resolve) => {
  setTimeout(() => resolve(null), delay);
});
