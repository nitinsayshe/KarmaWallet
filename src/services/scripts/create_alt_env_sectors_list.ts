import path from 'path';
import csvtojson from 'csvtojson';
import fs from 'fs';
import { parse } from 'json2csv';
import { SectorModel } from '../../models/sector';

interface IRawCompany {
  companyName: string;
  updateExisting: string;
  _id: string;
  url: string;
  logo: string;
  hiddenStatus: string;
  hiddenReason: string;
  notes: string;
  primary: string;
  secondary: string;
  tertiary: string;
  quaternary: string;
  quinary: string;
  senary: string;
}

export const createAltEnvSectorsList = async () => {
  const sectors = await SectorModel.find({}).populate({ path: 'parentSectors', model: SectorModel });
  const rawData: IRawCompany[] = await csvtojson().fromFile(path.resolve(__dirname, '.tmp', 'new-companies.csv'));

  const uniqueSectors = new Set<string>();
  const parseSectors: { name: string, _id: string }[] = [];

  for (const row of rawData) {
    const { primary, secondary, tertiary, quaternary, quinary, senary } = row;

    const invalidSectors: string[] = [];

    if (!!primary) {
      const found = sectors.find(s => s._id.toString() === primary);
      if (!!found) {
        if (!uniqueSectors.has(primary)) {
          const _id = found._id.toString();
          uniqueSectors.add(_id);
          parseSectors.push({ name: found.name, _id });
        }
      } else {
        invalidSectors.push(primary);
      }
    }

    if (!!secondary) {
      const found = sectors.find(s => s._id.toString() === secondary);
      if (!!found) {
        if (!uniqueSectors.has(secondary)) {
          const _id = found._id.toString();
          uniqueSectors.add(_id);
          parseSectors.push({ name: found.name, _id });
        }
      } else {
        invalidSectors.push(secondary);
      }
    }

    if (!!tertiary) {
      const found = sectors.find(s => s._id.toString() === tertiary);
      if (!!found) {
        if (!uniqueSectors.has(tertiary)) {
          const _id = found._id.toString();
          uniqueSectors.add(_id);
          parseSectors.push({ name: found.name, _id });
        }
      } else {
        invalidSectors.push(tertiary);
      }
    }

    if (!!quaternary) {
      const found = sectors.find(s => s._id.toString() === quaternary);
      if (!!found) {
        if (!uniqueSectors.has(quaternary)) {
          const _id = found._id.toString();
          uniqueSectors.add(_id);
          parseSectors.push({ name: found.name, _id });
        }
      } else {
        invalidSectors.push(quaternary);
      }
    }

    if (!!quinary) {
      const found = sectors.find(s => s._id.toString() === quinary);
      if (!!found) {
        if (!uniqueSectors.has(quinary)) {
          const _id = found._id.toString();
          uniqueSectors.add(_id);
          parseSectors.push({ name: found.name, _id });
        }
      } else {
        invalidSectors.push(quinary);
      }
    }

    if (!!senary) {
      const found = sectors.find(s => s._id.toString() === senary);
      if (!!found) {
        if (!uniqueSectors.has(senary)) {
          const _id = found._id.toString();
          uniqueSectors.add(_id);
          parseSectors.push({ name: found.name, _id });
        }
      } else {
        invalidSectors.push(senary);
      }
    }

    if (!!invalidSectors.length) console.log(invalidSectors);
  }

  const _csv = parse(parseSectors);
  fs.writeFileSync(path.join(__dirname, '.tmp', 'prod_sectors.csv'), _csv);
  fs.writeFileSync(path.join(__dirname, '.tmp', 'prod_sectors.json'), JSON.stringify(parseSectors));
};

/**
 * changing a company's parent company
 * means needing to change the data sources a company
 * has assigned to it (inheritance)
 *
 * changing the data sources of a company
 * will require changing the company's company to data
 * source mappings.
 *
 * changing the company's company to data source mappings
 * will require changing the company's company to unsdg
 * mappings.
 *
 * changing the company's company to unsdg mappings
 * will require the company's scores to be recalculated
 */

/**
 * changing a company's sectors means that all sector
 * average scores need to be recalculated.
 */
