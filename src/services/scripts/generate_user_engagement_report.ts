import fs from "fs";
import { Parser } from "json2csv";
import { CardStatus } from "../../lib/constants";
import { CardModel } from "../../models/card";
import { UserModel } from "../../models/user";

interface IUserEngagementReport {
  id: string;
  dateJoined: string;
  hasLinkedCard: boolean;
  firstLinkedCardDate: string;
  numCards: number;
}
interface IUserEngagementReportNoLinkedCards {
  id: string;
  dateJoined: string;
  hasLinkedCard: boolean;
  firstLinkedCardDate: string;
  numLinkedCards: number;
  cardStatus: string;
  linkedCardDate: string;
  unlinkedCardDate: string;
}

export const generateUserEngagementReport = async (): Promise<
  IUserEngagementReport[]
> => {
  try {
    console.log("generating user engagement report...");
    const report: IUserEngagementReport[] = [];
    const users = await UserModel.find({});

    await Promise.all(
      users.map(async (user) => {
        const userReport: IUserEngagementReport = {
          id: user._id.toString(),
          dateJoined: user.dateJoined.toISOString(),
          hasLinkedCard: false,
          firstLinkedCardDate: "",
          numCards: 0,
        };
        const cards = await CardModel.find({
          userId: user._id,
          status: CardStatus.Linked,
        }).sort({ createdOn: 1 });
        if (!!cards && cards.length > 0) {
          userReport.hasLinkedCard = true;
          userReport.firstLinkedCardDate = cards[0]?.createdOn?.toISOString();
          userReport.numCards = cards.length;
          if (cards.length > 1)
            console.log("cards", JSON.stringify(cards, null, 2));
        }
        report.push(userReport);
      })
    );

    const fileName = `./UserEngagement_${new Date().toISOString()}.csv`;
    console.log("Writing data to ", fileName);

    const parser = new Parser({
      fields: [
        "id",
        "dateJoined",
        "hasLinkedCard",
        "firstLinkedCardDate",
        "numCards",
      ],
    });
    const csv = parser.parse(report);

    fs.writeFileSync(fileName, csv);
    console.log("report generated successfully!");
    return report;
  } catch (err) {
    console.error(err);
  }
};

export const generateUserEngagementReport_NoLinkedCards = async (): Promise<
  IUserEngagementReportNoLinkedCards[]
> => {
  try {
    console.log("generating user engagement report...");
    const report: IUserEngagementReportNoLinkedCards[] = [];
    const unlinkedCardUsers = await CardModel.aggregate()
      .match({
        status: { $ne: CardStatus.Linked },
      })
      .group({ _id: "$userId" });
    const userIds = unlinkedCardUsers.map((id) => {
      return id._id;
    });

    await Promise.all(
      userIds.map(async (id) => {
        const user = await UserModel.findById(id);
        if (!user) return;
        console.log(user)
        const dateJoined = user.dateJoined?.toISOString();
        let hasLinkedCard = false;
        let firstLinkedCardDate = "";
        let numLinkedCards = 0;
        const linkedCards = await CardModel.find({
          userId: user._id,
          status: CardStatus.Linked,
        }).sort({ createdOn: 1 });
        if (!!linkedCards && linkedCards.length > 0) {
          hasLinkedCard = true;
          firstLinkedCardDate = linkedCards[0]?.createdOn?.toISOString();
          numLinkedCards = linkedCards.length;
          if (linkedCards.length > 1)
            console.log("cards", JSON.stringify(linkedCards, null, 2));
        }
        const notLinkedCards = await CardModel.find({
          userId: user._id,
          status: { $ne: CardStatus.Linked },
        });
        notLinkedCards.forEach((card) => {
          const userReport: IUserEngagementReportNoLinkedCards = {
            id,
            dateJoined,
            hasLinkedCard,
            firstLinkedCardDate,
            numLinkedCards,
            cardStatus: card.status?.toString(),
            linkedCardDate: card.createdOn?.toISOString(),
            unlinkedCardDate: card.lastModified?.toISOString(),
          };
          report.push(userReport);
        });
      })
    );

    const fileName = `./UserEngagement_NonLinkedCards_${new Date().toISOString()}.csv`;
    console.log("Writing data to ", fileName);

    const parser = new Parser({
      fields: [
        "id",
        "dateJoined",
        "hasLinkedCard",
        "firstLinkedCardDate",
        "numLinkedCards",
        "cardStatus",
        "linkedCardDate",
        "unlinkedCardDate",
      ],
    });
    const csv = parser.parse(report);

    fs.writeFileSync(fileName, csv);
    console.log("report generated successfully!");
    return report;
  } catch (err) {
    console.error(err);
  }
};
