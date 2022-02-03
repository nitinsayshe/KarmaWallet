const util = require('util');
const {
  password, user, connectionString, localUser, localPassword, localConnectionString,
} = require('../.env.mongo.json');
const exec = util.promisify(require('child_process').exec);

const exportCompanies = `mongoexport --username ${user} --password ${password} ${connectionString} --collection companies --jsonFormat canonical --out ./dbExport/companies.json`;
const exportBadges = `mongoexport --username ${user} --password ${password} ${connectionString} --collection badges --jsonFormat canonical --out ./dbExport/badges.json`;
const exportCategories = `mongoexport --username ${user} --password ${password} ${connectionString} --collection categories --jsonFormat canonical --out ./dbExport/categories.json`;
const exportSubcategories = `mongoexport --username ${user} --password ${password} ${connectionString} --collection subcategories --jsonFormat canonical --out ./dbExport/subcategories.json`;
const exportHiddenCompanies = `mongoexport --username ${user} --password ${password} ${connectionString} --collection hidden_companies --jsonFormat canonical --out ./dbExport/hiddenCompanies.json`;
const exportPlaidItems = `mongoexport --username ${user} --password ${password} ${connectionString} --collection plaiditems --jsonFormat canonical --out ./dbExport/plaidItems.json`;
const exportUsers = `mongoexport --username ${user} --password ${password} ${connectionString} --collection users --jsonFormat canonical --out ./dbExport/users.json`;

const importCompanies = `mongoimport ${localConnectionString ? `--username ${localUser} --password ${localPassword} ${localConnectionString}` : ''} --db karma_wallet --collection companies --drop --file ./dbExport/companies.json`;
const importBadges = `mongoimport ${localConnectionString ? `--username ${localUser} --password ${localPassword} ${localConnectionString}` : ''} --db karma_wallet --collection badges --drop --file ./dbExport/badges.json`;
const importCategories = `mongoimport ${localConnectionString ? `--username ${localUser} --password ${localPassword} ${localConnectionString}` : ''} --db karma_wallet --collection categories --drop --file ./dbExport/categories.json`;
const importSubcategories = `mongoimport ${localConnectionString ? `--username ${localUser} --password ${localPassword} ${localConnectionString}` : ''} --db karma_wallet --collection subcategories --drop --file ./dbExport/subcategories.json`;
const importHiddenCompanies = `mongoimport ${localConnectionString ? `--username ${localUser} --password ${localPassword} ${localConnectionString}` : ''} --db karma_wallet --collection hidden_companies --drop --file ./dbExport/hiddenCompanies.json`;
const importPlaidItems = `mongoimport ${localConnectionString ? `--username ${localUser} --password ${localPassword} ${localConnectionString}` : ''} --db karma_wallet --collection plaiditems --drop --file ./dbExport/plaidItems.json`;
const importUsers = `mongoimport ${localConnectionString ? `--username ${localUser} --password ${localPassword} ${localConnectionString}` : ''} --db karma_wallet --collection users --drop --file ./dbExport/users.json`;

const syncArr = [
  { collection: 'companies', exportStr: exportCompanies, importStr: importCompanies },
  { collection: 'badges', exportStr: exportBadges, importStr: importBadges },
  { collection: 'categories', exportStr: exportCategories, importStr: importCategories },
  { collection: 'subcategories', exportStr: exportSubcategories, importStr: importSubcategories },
  { collection: 'hiddenCompanies', exportStr: exportHiddenCompanies, importStr: importHiddenCompanies },
  { collection: 'plaiditems', exportStr: exportPlaidItems, importStr: importPlaidItems },
  { collection: 'users', exportStr: exportUsers, importStr: importUsers },
];

const _process = async (processStr: string) => {
  try {
    const { stdout, stderr } = await exec(processStr);
    console.log('Output', stdout);
    console.log('Output:', stderr);
  } catch (e) {
    console.error(`Failed on: \n|| ${processStr} ||${e})`);
  }
};

(async () => {
  for (let i = 0; i < syncArr.length; i += 1) {
    const { collection, exportStr } = syncArr[i];
    console.log(`\nStarting export for: ${collection}`);
    await _process(exportStr);
    console.log(`Finished export for: ${collection}`);
  }
  setTimeout(async () => {
    for (let i = 0; i < syncArr.length; i += 1) {
      const { collection, importStr } = syncArr[i];
      console.log(`Starting import for: ${collection}`);
      await _process(importStr);
      console.log(`Finished import for: ${collection}`);
    }
  }, 10000);
})();
