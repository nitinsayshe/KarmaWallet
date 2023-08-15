import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { createTestIdentities, deleteTestIdentites } from '../services/user/testIdentities';

dayjs.extend(utc);

export const exec = async () => {
  try {
    await deleteTestIdentites();
    await createTestIdentities();
  } catch (err) {
    console.error(err);
  }
};
