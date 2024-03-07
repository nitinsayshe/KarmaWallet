# karmawallet-backend-ts
deployment test 19


## Batch Updates

We update data in our database on a monthly cadence. Each month, a new batch updates document is created and added to the Data folder on Google Drive: https://drive.google.com/drive/folders/1vTusk4-0glvZlw3M4-vS_Hacdtnk7jEC?usp=share_link


## Syncing with Staging

Once all batch updates are complete in production, ensure staging is up to date as well. To do so, you can run the following script

## Testing

The pre-commit check currently makes sure that the project compiles, but doesn't automatically run any tests. There are two ways to run the tests:

1. Natively   - dependencies: jest, tsc

 Run the tests using servers pointed to in your `.env` file, simple run:

```bash
npm test
```

2. In a Docker Container - dependencies: docker, docker-compose

If this is your first time running the tests using docker, create the impact-karma docker network by running:

```bash
docker network create impact-karma
```

Use docker-compose to spin up a container and run the tests:

```bash
npm run dockerTest
```

Note: Many tests are currently skipped. Usually, this is to avoid hitting external APIs. We can enable these tests as we move to mocking these services.


## Adding an Email 

- Create a new folder in `src/templates/email` with at least one file for the  html. 
- Reference other email examples to see which classes can be reused for styling (global styles live in `src/templates/email/style.hbs`)
- If your email requires additional styles/formatting that are not in the global styles, add a style.hbs file to the same folder your email template html is in, this will allow your html to access those style classes
- Once you have made your changes, you will need to run `npm run build` to ensure the templates are added to the `dist` folder

## Sending an Employer Gift

- Use the `processGPADeposits` function in `src/services/transaction`. User will need to be in the employer `group` to be able to receive the deposit. Include `groupId`, type of `TransactionCreditSubtypeEnum.Employer` an array of the gpa deposits (including userId and amount), and an optional `memo` of 99 characters or less. This will show up on the Transaction Details for the user. Example data below:

```
export interface IInitiateGPADepositsRequest {
  groupId: '6233a60f1fc03e8853a64dc8',
  type:TransactionCreditSubtypeEnum.Employer,
  gpaDeposits: [
    userId: '6233a60f1fc03e8853a982e9',
    amount: 50,
  ],
  memo?: 'Happy holidays from Impact Karma!'
}
```

Sending this money will send a text message and an email (`employerGift` in our email templates folder) to the cardholder.