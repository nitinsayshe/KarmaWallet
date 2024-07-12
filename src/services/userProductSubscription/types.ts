import { IProductSubscriptionDocument } from '../../models/productSubscription/types';
import { IUserDocument } from '../../models/user';

export interface IUserProductSubscriptionCreation {
  user: IUserDocument;
  status: string;
  productSubscription: IProductSubscriptionDocument;
  integrations?: {
    stripe?: any;
  }
}
