import { IRequestHandler } from '../../../types/request';
import * as output from '../../../services/output';
import { asCustomError } from '../../../lib/customError';
import * as CardProductService from '../../../integrations/marqeta/cardProducts';

export const createCardProduct: IRequestHandler<{}, {}, {}> = async (req, res) => {
  try {
    const { user: data } = await CardProductService.createCardProduct(req);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const listCardProduct: IRequestHandler<{}, {}, {}> = async (req, res) => {
  try {
    const data = await CardProductService.listCardProduct();
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};

export const getCardproduct: IRequestHandler<{cardProductToken:string}, {}, {}> = async (req, res) => {
  try {
    const { data } = await CardProductService.getCardproduct(req);
    output.api(req, res, data);
  } catch (err) {
    output.error(req, res, asCustomError(err));
  }
};
