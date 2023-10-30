# karmawallet-backend-ts
deployment test 15


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

## Building New Email

Follow the patterns seen in the other emails, be sure to delete the `dist` folder and run `npm run build` to generate the new email templates.