// import { KarmaMembershipPaymentPlanEnum, KarmaMembershipTypeEnum } from '../../models/user/types';
// import { addKarmaMembershipToUser } from '../karmaCard';

// export const backfillKarmaMembershipStatus = async () => {
//   try {
//     const msDelayBetweenBatches = 500;
//     const req = {
//       batchQuery: { 'integrations.marqeta': { $exists: true }, 'integrations.marqeta.status': 'ACTIVE' },
//       batchLimit: 100,
//     };
//     await iterateOverUsersAndExecWithDelay(
//       req,
//       async (_: UserIterationRequest<{}>, userBatch: PaginateResult<IUserDocument>): Promise<UserIterationResponse<{}>[]> => {
//         await Promise.all(
//           userBatch.docs.map(async (user: IUserDocument) => {
//             try {
//               console.log(`subscribing user ${user._id}, ${user.emails.find((e) => e.primary)?.email} to karma membership`);
//               console.log('user marqeta status', user.integrations.marqeta.status);

//               await addKarmaMembershipToUser(user, KarmaMembershipTypeEnum.standard, KarmaMembershipPaymentPlanEnum.free);
//               console.log(`created subscription ${user.karmaMemberships[0]} for user ${user._id}`);
//             } catch (err) {
//               console.error(`Error saving user: ${err}`);
//             }
//           }),
//         );

//         return userBatch.docs.map((user: IUserDocument) => ({
//           userId: user._id,
//         }));
//       },
//       msDelayBetweenBatches,
//     );
//   } catch (err) {
//     console.error(err);
//   }
// };
