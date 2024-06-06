import fs from 'fs';
import path from 'path';
import { createContact, getSubscribedLists, subscribeContactToList } from '../../integrations/activecampaign';
import { sleep } from '../../lib/misc';
import { ActiveCampaignListId } from '../../types/marketing_subscription';

const backoffMs = 1000;

export const addUsersToDebitCardWaitlist = async () => {
  // check if the user is already in the waitlist on active campaign

  const waitlistEmails: string[] = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, '../../../waitlistEmails.json'), 'utf8'),
  );
  for (const email of waitlistEmails) {
    try {
      console.log(email);
      // check if the user is already in the waitlist on active campaign
      // get lists for this user
      const lists = await getSubscribedLists(email);
      console.log(`lists for ${email} are: ${JSON.stringify(lists, null, 2)}`);
      // if error, try adding the user to the waitlist
      if (!lists?.length) {
        // create new contact and add to waitlist
        console.log(`creating new AC contact for ${email}`);
        const newContact = await createContact({ email });
        if (!newContact) {
          throw new Error(`failed to create contact for ${email}`);
        }
        console.log(`new contact: ${JSON.stringify(newContact, null, 2)}`);
      } else if (lists?.find((list) => list === ActiveCampaignListId.DebitCardWaitlist)) {
        continue;
      }
      console.log(`adding ${email} to the waitlist`);
      await subscribeContactToList(email, ActiveCampaignListId.DebitCardWaitlist);
      await sleep(backoffMs);
    } catch (e) {
      console.log(JSON.stringify(e, null, 2));
    }
  }
};
