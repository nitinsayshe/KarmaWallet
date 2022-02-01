import { Response, NextFunction } from 'express-serve-static-core';
import { Socket } from 'socket.io';
import { ExtendedError } from 'socket.io/dist/namespace';
import protectedRequirements, { IProtectRouteRequirements } from '../../middleware/protected';
import { IRequest } from '../../types/request';

export default (requirements: IProtectRouteRequirements) => async (socket: Socket, next: (err?: ExtendedError) => void) => protectedRequirements(requirements)((socket.request as unknown as IRequest), ({} as Response), (next as NextFunction));
