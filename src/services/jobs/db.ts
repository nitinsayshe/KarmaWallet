import { IJob, JobModel } from '../../mongo/model/job';
import { toUTC } from '../../lib/date';

export const create = (title: string, instructions: string, description: string, department: string, location: string) => {
  const timestamp = toUTC(new Date());

  const job = new JobModel({
    title,
    instructions,
    description,
    department,
    jobLocation: location,
    createdAt: timestamp,
    lastModified: timestamp,
  });

  return job.save();
};

export const findByIdAndUpdate = async (id: string, updates: Partial<IJob>) => JobModel.findByIdAndUpdate(id, { ...updates, lastModified: toUTC(new Date()) }, { new: true });
