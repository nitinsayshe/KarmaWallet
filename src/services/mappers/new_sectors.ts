import path from 'path';
import csvtojson from 'csvtojson';
import CustomError, { asCustomError } from '../../lib/customError';
import { ISector, ISectorDocument, SectorModel } from '../../models/sector';
import { ErrorTypes } from '../../lib/constants';

/**
 * INSTRUCTIONS
 *
 * - update headers inside .csv files to match the ones
 *   specified in the interfaces below
 */

/**
 * creates the sectors collection
 *
 * TODO: map carbonOffsets to sectors
 * TODO: map to companies
 */

interface IBaseData {
  tier_1: string;
  tier_2: string;
  tier_3: string;
  tier_4: string;
}

interface ICarbonMultiplierData extends IBaseData {
  carbonMultiplier: string;
}

export const createSectors = async () => {
  try {
    const rawData: ICarbonMultiplierData[] = await csvtojson().fromFile(path.resolve(__dirname, '.tmp', 'new_sectors.csv'));

    const tier1Models: ISectorDocument[] = [];
    const tier2Models: ISectorDocument[] = [];
    const tier3Models: ISectorDocument[] = [];
    const tier4Models: ISectorDocument[] = [];

    for (const row of rawData) {
      let tier1Model: ISectorDocument;
      let tier2Model: ISectorDocument;
      let tier3Model: ISectorDocument;
      let tier4Model: ISectorDocument;

      if (row.tier_1) {
        tier1Model = tier1Models.find(m => m.name === row.tier_1);
        if (!tier1Model) {
          tier1Model = new SectorModel({
            name: row.tier_1,
            carbonMultiplier: 0,
            tier: 1,
          });
          tier1Model = await tier1Model.save();
          tier1Models.push(tier1Model);
        }
      }

      if (!!row.tier_2 && !!tier1Model) {
        tier2Model = tier2Models.find(m => m.name === row.tier_2);
        if (!tier2Model) {
          tier2Model = new SectorModel({
            name: row.tier_2,
            carbonMultiplier: 0,
            tier: 2,
            parentSectors: [tier1Model],
          });
          tier2Model = await tier2Model.save();
          tier2Models.push(tier2Model);
        }
      } else if (!!tier2Model) {
        if ((tier2Model.parentSectors[0] as ISector).name !== tier1Model.name) {
          throw new CustomError(`duplicate tier 2 name found: ${tier2Model.name}`);
        }
      } else if (!tier1Model) {
        throw new CustomError(`invalid tier 2 sector: ${row.tier_2}. missing at least one parent tier.`);
      }

      if (!!row.tier_3 && !!tier1Model && !!tier2Model) {
        // check if this sector has same parent tier if name is found
        tier3Model = tier3Models.find(m => m.name === row.tier_3 && (m.parentSectors[0] as ISector).name === tier1Model.name && (m.parentSectors[1] as ISector).name === tier2Model.name);
        if (!tier3Model) {
          tier3Model = new SectorModel({
            name: row.tier_3,
            carbonMultiplier: 0,
            tier: 3,
            parentSectors: [tier1Model, tier2Model],
          });
          tier3Model = await tier3Model.save();
          tier3Models.push(tier3Model);
        }
      } else if (!!tier3Model) {
        if ((tier3Model.parentSectors[0] as ISector).name !== tier1Model.name || (tier3Model.parentSectors[1] as ISector).name !== tier2Model.name) {
          throw new CustomError(`duplicate tier 3 name found: ${tier3Model.name}`);
        }
      } else if (!tier1Model && !tier2Model) {
        throw new CustomError(`invalid tier 2 sector: ${row.tier_3}. missing at least one parent tier.`);
      }

      if (!!row.tier_4 && !!tier1Model && !!tier2Model && !!tier3Model) {
        // check if this sector has same parent tier if name is found
        tier4Model = tier4Models.find(m => m.name === row.tier_4 && (m.parentSectors[0] as ISector).name === tier1Model.name && (m.parentSectors[1] as ISector).name === tier2Model.name && (m.parentSectors[2] as ISector).name === tier3Model.name);
        if (!tier4Model) {
          tier4Model = new SectorModel({
            name: row.tier_4,
            carbonMultiplier: 0,
            tier: 4,
            parentSectors: [tier1Model, tier2Model, tier3Model],
          });
          tier4Model = await tier4Model.save();
          tier4Models.push(tier4Model);
        }
      } else if (!!tier4Model) {
        if ((tier4Model.parentSectors[0] as ISector).name !== tier1Model.name || (tier4Model.parentSectors[1] as ISector).name !== tier2Model.name || (tier4Model.parentSectors[2] as ISector).name !== tier3Model.name) {
          throw new CustomError(`duplicate tier 4 name found: ${tier4Model.name}`);
        }
      } else if (!tier1Model && !tier2Model && !tier3Model) {
        throw new CustomError(`invalid tier 4 sector: ${row.tier_4}. missing at least one parent tier.`);
      }
    }

    console.log('\n+---------------+');
    console.log('| tier | count\t|');
    console.log('+---------------+');
    console.log(`| 1    | ${tier1Models.length}\t|`);
    console.log(`| 2    | ${tier2Models.length}\t|`);
    console.log(`| 3    | ${tier3Models.length}\t|`);
    console.log(`| 4    | ${tier4Models.length}\t|`);
    console.log('+---------------+\n');
  } catch (err) {
    throw asCustomError(err);
  }
};

export const mapCarbonMultipliersToSectors = async () => {
  console.log('\nmapping carbon multipliers to sectors...');
  const rawData: ICarbonMultiplierData[] = await csvtojson().fromFile(path.resolve(__dirname, '.tmp', 'new_sectors.csv'));
  let count = 0;

  for (const row of rawData) {
    try {
      let sectorName: string;
      let tier: number;

      if (!!row.tier_4) {
        sectorName = row.tier_4;
        tier = 4;
      }

      if (!sectorName && !!row.tier_3) {
        sectorName = row.tier_3;
        tier = 3;
      }

      if (!sectorName && !!row.tier_2) {
        sectorName = row.tier_2;
        tier = 2;
      }

      if (!sectorName && !!row.tier_1) {
        sectorName = row.tier_1;
        tier = 1;
      }

      if (!sectorName) throw new CustomError('Invalid row found. Missing all tiers.', ErrorTypes.INVALID_ARG);

      const sectors = await SectorModel.find({ name: sectorName, tier });

      if (!sectors.length) throw new CustomError(`Tier ${tier} sector ${sectorName} not found.`, ErrorTypes.NOT_FOUND);

      let updated = false;
      for (const sector of sectors) {
        if (!!sector.carbonMultiplier) throw new CustomError(`Carbon multiplier has already been assigned to tier ${tier} sector: ${sectorName}`);

        sector.carbonMultiplier = parseFloat(row.carbonMultiplier);

        await sector.save();

        updated = true;
      }

      if (updated) {
        count++;
      } else {
        throw new CustomError(`Something went wrong while updating tier ${tier} sector ${sectorName}`);
      }
    } catch (err) {
      const error = asCustomError(err);
      console.log(`\n[-] ${error.message}`);
    }
  }

  console.log(`\n[+] ${count}/${rawData.length} sectors updated with carbon multipliers`);
};

export const resetSectors = async () => {
  try {
    console.log('resetting sectors...');
    await SectorModel.deleteMany({});
    console.log('[+] sectors reset successfully');
  } catch (err) {
    console.log('ERROR RESETTING SECTORS');
    console.log(err);
  }
};
