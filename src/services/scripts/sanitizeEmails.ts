import { UserModel } from '../../models/user';

export const sanitizeEmails = async () => {
  const users = await UserModel.find({});
  // const rawEmails = fs.readFileSync(path.resolve(__dirname, './.tmp', 'emails.json'), 'utf8');
  // const emails = JSON.parse(rawEmails);
  // const manuallyCheck: any = [];
  let count = 0;

  for (const user of users) {
    count += 1;
    const userInDB = await UserModel.findOne({ _id: user._id });
    let primaryEmail = userInDB.emails.find((email: any) => !!email.primary).email.trim();
    const primaryEmailArray = primaryEmail.split('');
    const hasTwoEmails = primaryEmailArray.filter((character) => character === '@').length > 1;

    if (hasTwoEmails) {
      const emailWithoutDomain = primaryEmail.slice(0, primaryEmail.indexOf('@'));
      primaryEmail = primaryEmail.slice(primaryEmail.lastIndexOf(emailWithoutDomain), primaryEmail.length);
    }

    userInDB.emails.find((email: any) => !!email.primary).email = primaryEmail;
    await userInDB.save();

    console.log(`[+] ${count}/${users.length} users updated, ${primaryEmail}`);
  }
  // fs.writeFileSync(path.join(__dirname, '.tmp', 'emailsToUpdate.json'), JSON.stringify(manuallyCheck));
};
