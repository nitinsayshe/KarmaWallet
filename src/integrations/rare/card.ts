import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { CardModel, ICardDocument } from '../../models/card';
import { CardStatus, ErrorTypes } from '../../lib/constants';
import CustomError, { asCustomError } from '../../lib/customError';
import { IUserDocument } from '../../models/user';

dayjs.extend(utc);

export interface IRareCard {
  card_id: string;
  card_type: string;
  last_four: string;
  expr_month: string;
  expr_year: string;
}

export class Card {
  _user: IUserDocument = null;
  _rareCard: IRareCard = null;
  _card: ICardDocument = null;

  constructor(user: IUserDocument, rareCard: IRareCard) {
    if (!user) throw new CustomError('Rare Integration Card Error - no user provided', ErrorTypes.INVALID_ARG);
    if (!rareCard) throw new CustomError('Rare Integration Card Error - no rare card provided', ErrorTypes.INVALID_ARG);
    this._user = user;
    this._rareCard = rareCard;
  }

  get _id() { return this._card._id; }
  get name() {
    return this._card?.name
      || `${this._rareCard.card_type} - ${this._rareCard.last_four}`;
  }
  get isLoaded() { return !!this._card; }

  load = async () => {
    // if user does not have a rare userId, then we have never
    // received a transaction for this user and thus, no card
    // will exist
    if (!this._user.integrations?.rare?.userId) return;

    try {
      const query = {
        userId: this._user._id,
        name: this.name,
        'integrations.rare.userId': this._user.integrations?.rare?.userId,
      };

      this._card = await CardModel.findOne(query);
    } catch (err) {
      throw asCustomError(err);
    }
  };

  toKarmaFormat = () => ({
    userId: this._user,
    name: this.name,
    mask: this.name,
    type: 'credit',
    status: this._card?.status || CardStatus.Unlinked,
    integrations: {
      rare: {
        ...this._rareCard,
        userId: this._user.integrations?.rare?.userId,
      },
    },
    unlinkedDate: this._card?.unlinkedDate,
    removedDate: this._card?.removedDate,
  });

  save = async () => {
    if (!!this._card) {
      // a karma card already exists.
      // only save if differences are found...
      // TODO: check for differences between this.toKarmaFormat and this._card
    } else {
      this._card = new CardModel(this.toKarmaFormat());
      const now = dayjs().utc().toDate();
      this._card.createdOn = now;
      this._card.lastModified = now;
      this._card = await this._card.save();
    }
  };
}
