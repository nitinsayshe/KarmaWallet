import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { createTestIdentities, deleteTestIdentites } from '../services/user/testIdentities';

dayjs.extend(utc);

export const exec = async () => {
  try {
    console.log('deleting existing test identities...');
    await deleteTestIdentites();
    console.log('creating new test identities...');
    await createTestIdentities();
    console.log('Done resetting identities!');
  } catch (err) {
    console.error(err);
  }
};
