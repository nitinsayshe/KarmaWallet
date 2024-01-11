import fs from 'fs';
import csvtojson from 'csvtojson';
import path from 'path';
import { ISectorDocument, SectorModel } from '../../models/sector';

type MCCMappingRow = {
  mcc: number;
  sectorName: string;
};

const getSectorByName = async (name: string): Promise<ISectorDocument> => {
  try {
    const sector = await SectorModel.findOne({ name });
    if (!sector?._id) {
      throw new Error(`Sector ${name} not found`);
    }
    return sector;
  } catch (err) {
    console.error(err);
    return null;
  }
};

export const addSectorMCCCodes = async (inputFilePath?: string): Promise<ISectorDocument[]> => {
  try {
    let mappingsRaw: string;
    if (!inputFilePath) {
      mappingsRaw = fs.readFileSync(path.resolve(__dirname, './.tmp', 'MCC_Sector_Mappings.csv'), 'utf8');
    } else {
      mappingsRaw = fs.readFileSync(path.resolve(__dirname, inputFilePath), 'utf8');
    }

    const mappings: MCCMappingRow[] = (await csvtojson().fromString(mappingsRaw)) as MCCMappingRow[];
    if (!mappings) {
      throw new Error('No search results found');
    }
    console.log(`read ${mappings.length} mcc codes`);

    // group by sector_name
    const groupedSectors: { [key: string]: number[] } = mappings.reduce(
      (acc, mapping) => {
        if (!acc[mapping.sectorName]) {
          acc[mapping.sectorName] = [];
        }
        acc[mapping.sectorName].push(mapping.mcc);
        return acc;
      },
      {} as { [key: string]: number[] },
    );

    console.log(`starting to set ${Object.keys(groupedSectors)?.length} secotor's mcc codes`);
    const sectors = await Promise.all(
      Object.keys(groupedSectors).map(async (sectorName) => {
        // get the sector
        const sector = await getSectorByName(sectorName);
        if (!sector) {
          throw new Error('No sector found');
        }
        console.log(`setting mcc codes: ${JSON.stringify(groupedSectors[sector.name])} for ${sectorName}`);
        sector.mccs = groupedSectors[sector.name];
        return sector.save();
      }),
    );
    return sectors || [];
  } catch (err) {
    console.error('Error adding MCC codes to sectors');
    console.error(err);
    return [];
  }
};
