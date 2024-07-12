import { SandboxedJob } from 'bullmq';
import { PaginateResult } from 'mongoose';
import { JobNames } from '../lib/constants/jobScheduler';
import { isUserDocument, returnUserOrVisitorFromEmail } from '../services/user/utils';
import { setClosedEmailAndStatusAndRemoveMarqetaIntegration } from '../integrations/marqeta/user/utils';
import { IKarmaCardApplicationDocument, ApplicationStatus } from '../models/karmaCardApplication/types';
import { iterateOverKarmaCardApplicationsAndExecWithDelay } from '../services/karmaCard/utils';
import { KarmaCardApplicationIterationRequest, KarmaCardApplicationIterationResponse } from '../services/karmaCard/utils/types';

export const backoffMs = 500;

export const updateExpiredApplications = async (
  _: KarmaCardApplicationIterationRequest<{}>,
  applicationBatch: PaginateResult<IKarmaCardApplicationDocument>,
): Promise<KarmaCardApplicationIterationResponse<{ applicantEmail: string }>[]> => (await Promise.all(applicationBatch.docs.map(async (application) => {
  try {
    const { data: entity } = await returnUserOrVisitorFromEmail(application.email);
    if (!entity) {
      throw new Error(`No user or visitor found with email ${application.email}`);
    }
    // close this user's account in marqeta
    await setClosedEmailAndStatusAndRemoveMarqetaIntegration(entity);

    application.status = ApplicationStatus.CLOSED_DECLINED;
    const savedApplication = await application.save();

    return {
      applicationId: savedApplication._id,
      fields: {
        applicantEmail: isUserDocument(entity) ? entity?.emails?.find((e) => e.primary)?.email : entity.email,
      },
    } as KarmaCardApplicationIterationResponse<{ applicantEmail: string }>;
  } catch (err) {
    console.log(err);
    return null;
  }
}))).filter((a) => !!a);

export const exec = async () => {
  const req: KarmaCardApplicationIterationRequest<{}> = {
    batchLimit: 75,
    // Pull all karma applications set to expire (has a set expiration date)
    // and that date is less than the current date
    batchQuery: {
      $and: [{ expirationDate: { $ne: null } }, { expirationDate: { $lt: new Date() } }, { status: ApplicationStatus.DECLINED }],
    },
  };

  const responses = await iterateOverKarmaCardApplicationsAndExecWithDelay(
    req,
    updateExpiredApplications,
    backoffMs,
  );

  console.log(`updated ${responses.length} applications`);
};

export const onComplete = () => {
  console.log(`${JobNames.UpdateExpiredApplications} finished`);
};

export const onFailed = (_: SandboxedJob, err: Error) => {
  console.log(`${JobNames.UpdateExpiredApplications} failed`);
  console.log(err);
};
