import { PersonaCaseStatusEnum, PersonaInquiryStatusEnum } from '../integrations/persona/types';

export const PersonaIntegrationSchema = {
  type: {
    accountId: { type: String },
    inquiries: [
      {
        type: {
          id: { type: String },
          templateId: { type: String },
          status: { type: String, enum: Object.values(PersonaInquiryStatusEnum) },
          createdAt: { type: String },
        },
      },
    ],
    cases: [
      {
        type: {
          id: { type: String },
          status: { type: String, enum: Object.values(PersonaCaseStatusEnum) },
          createdAt: { type: String },
        },
      },
    ],
  },
};
