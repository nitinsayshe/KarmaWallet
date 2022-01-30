import { JobStatus } from '../../lib/constants';

export default {
  name: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    required: true,
    enum: Object.values(JobStatus),
    default: JobStatus.Inactive,
  },
  lastModified: { type: Date },
};
