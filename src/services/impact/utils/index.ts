import { MiscModel } from '../../../models/misc';

export const getUserImpactRatings = async (): Promise<[number, number][]> => {
  const RatingKey = 'user-impact-ratings';

  let ratings = await MiscModel.findOne({ key: RatingKey });

  if (!ratings) {
    try {
      ratings = new MiscModel({
        key: RatingKey,
        value: '0-30,31-60,61-100',
      });

      await ratings.save();
    } catch (err) {
      console.log('\n[-] failed to save user impact ratings.');
      console.log(err);
    }
  }

  return ratings.value
    .split(',')
    .map(val => {
      const [min, max] = val.split('-');
      return [parseInt(min), parseInt(max)];
    });
};
