import { api, error } from '../services/output';
import { asCustomError } from '../lib/customError';
import { IRequestHandler } from '../types/request';
import { ISector } from '../models/sector';

export const getBrowseBySectors: IRequestHandler = async (req, res) => {
  try {
    const sectors: (ISector & {_id: string})[] = [
      {
        _id: '62192ef1f022c9e3fbff0aac',
        name: 'Apparel',
        tier: 1,
        carbonMultiplier: 0.329888819,
        parentSectors: [],
      },
      {
        _id: '62192ef3f022c9e3fbff0c20',
        name: 'Technology',
        tier: 1,
        carbonMultiplier: 0.215181877,
        parentSectors: [],
      },
      {
        _id: '62192ef2f022c9e3fbff0aec',
        name: 'Dining Out',
        tier: 1,
        carbonMultiplier: 0.369305374,
        parentSectors: [],
      },
      {
        _id: '62192ef2f022c9e3fbff0b52',
        name: 'Home & Garden',
        tier: 1,
        carbonMultiplier: 0.392677714,
        parentSectors: [],
      },
      {
        _id: '62192ef3f022c9e3fbff0c40',
        name: 'Travel',
        tier: 1,
        carbonMultiplier: 0.797529864,
        parentSectors: [],
      },
      {
        _id: '62192ef3f022c9e3fbff0ba4',
        name: 'Personal Care',
        tier: 1,
        carbonMultiplier: 0.385818337,
        parentSectors: [],
      },
    ];

    api(req, res, { sectors });
  } catch (err) {
    error(req, res, asCustomError(err));
  }
};
