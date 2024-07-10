import { updateUserSubscriptions, updateVisitorSubscriptions } from '..';
import { unsubscribeContactFromLists } from '../../../integrations/activecampaign';
import { IUserDocument } from '../../../models/user';
import { IVisitorDocument } from '../../../models/visitor';
import { ActiveCampaignListId, MarketingSubscriptionCode } from '../../../types/marketing_subscription';
import { isUserDocument, getEmailFromUserOrVisitor } from '../../user/utils';

export const removeUserFromDebitCardHoldersList = async (entity: IUserDocument | IVisitorDocument) => {
  const isUser = isUserDocument(entity);
  const entityId = entity._id.toString();
  await unsubscribeContactFromLists(getEmailFromUserOrVisitor(entity), [ActiveCampaignListId.DebitCardHolders]);
  if (isUser) await updateUserSubscriptions(entityId, [], [MarketingSubscriptionCode.debitCardHolders]);
  else await updateVisitorSubscriptions(entityId, [], [MarketingSubscriptionCode.debitCardHolders]);
};
