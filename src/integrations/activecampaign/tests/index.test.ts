import { afterAll, afterEach, beforeAll, describe, expect, it } from '@jest/globals';
import { randomUUID } from 'crypto';
import { getActiveCampaignContactByEmail, removeDuplicateAutomations, removeDuplicateContactAutomations } from '..';

describe('active campaign logic tests', () => {
  afterEach(() => {
    /* clean up between tests */
  });

  afterAll(async () => {});

  beforeAll(async () => {});

  // skipping to avoid hitting the active campaign api unintentionally
  it.skip('getActiveCampaignContactByEmail returns contact data', async () => {
    const contact = await getActiveCampaignContactByEmail('jayant@theimpactkarma.com');
    expect(contact).toBeDefined();
    expect(contact).toHaveProperty('contactAutomations');
    expect(contact).toHaveProperty('contactLists');
    expect(contact).toHaveProperty('fieldValues');
    expect(contact.contactLists).toBeDefined();
    expect(contact.contactAutomations).toBeDefined();
    expect(contact.fieldValues).toBeDefined();
  });

  // skipping to avoid hitting the active campaign api unintentionally
  it.skip('removeDuplicateContactAutomationsById removes a contacts dupe automations, keeping only the oldest', async () => {
    try {
      const res = await removeDuplicateContactAutomations('andy@theimpactkarma.com');
      expect(res).toBeDefined();
    } catch (err) {
      expect(err).toBeUndefined();
    }
  });

  it('removeDuplicateAutomations returns ids of oldest duplicate automations', async () => {
    const datesOfAutomationsToKeep = ['2023-02-05T09:13:22-05:00', '2023-02-05T09:13:22-05:00'];
    const datesOfAutomationsToRemove = [
      '2023-03-05T09:13:22-05:00',
      '2023-02-10T09:13:22-05:00',
      '2023-03-15T09:13:22-05:00',
    ];
    const idsToKeep = [randomUUID(), randomUUID()];
    const idsToRemove = [randomUUID(), randomUUID(), randomUUID()];

    const dupes = removeDuplicateAutomations([
      {
        automation: '1',
        adddate: datesOfAutomationsToKeep[0],
        id: idsToKeep[0],
      },
      {
        automation: '1',
        adddate: datesOfAutomationsToRemove[0],
        id: idsToRemove[0],
      },
      {
        automation: '1',
        adddate: datesOfAutomationsToRemove[1],
        id: idsToRemove[1],
      },
      {
        automation: '2',
        adddate: datesOfAutomationsToKeep[1],
        id: idsToKeep[1],
      },
      {
        automation: '2',
        adddate: datesOfAutomationsToRemove[2],
        id: idsToRemove[2],
      },
    ]);

    expect(dupes).toBeDefined();
    expect(dupes.length).toBe(3);
    dupes.forEach((d) => {
      expect(idsToRemove).toContain(d.id);
    });
  });
});
