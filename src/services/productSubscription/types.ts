import { ProductSubscriptionStatus, ProductSubscriptionType } from '../../models/productSubscription/types';

export interface ICreateProductSubscriptionData {
  amount: string;
  name: string;
  type: ProductSubscriptionType;
  status: ProductSubscriptionStatus;
  integrations?: {
    stripe?: any;
  }
}
