export interface IFCMNotification {
  title: string;
  body: string;
  type?: string;
}
export interface IPushNotification {
  notification: IFCMNotification;
  token: string;
  data: {
    type: string;
  };
}
