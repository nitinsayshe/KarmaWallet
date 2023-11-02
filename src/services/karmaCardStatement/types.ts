export interface IKarmaCardStatementIdParam {
  statementId: string;
}

export interface IKarmaCardStatement {
  address: string;
  fullName: string;
  startDate: Date;
  endDate: Date;
  beginningBalance: number;
  endingBalance: number;
  pdf: string;
}
