import { JobStatus } from '../../lib/constants';
import { toUTC } from '../../lib/date';
import { JobStatusModel } from '../../mongo/model/jobStatus';

const getJob = async (jobName: string) => {
  let job = await JobStatusModel.findOne({ name: jobName });

  // if no job found in db, means is the first time
  // this job is being run, and the job object needs to
  // created.
  if (!job) {
    job = new JobStatusModel({
      name: jobName,
      status: 'inactive',
    });

    await job.save();
  }

  return job;
};
export const jobIsActive = async (jobName: string) => {
  const job = await getJob(jobName);
  return job.status === 'active';
};

export const updateJobStatus = async (jobName: string, status: JobStatus) => {
  const job = await getJob(jobName);

  // ensure only active and inactive values are assigned
  job.status = status;
  job.lastModified = toUTC(new Date());
  await job.save();
};
