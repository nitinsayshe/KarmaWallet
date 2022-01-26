import express from 'express';
import { Socket } from 'socket.io';
import { ExtendedError } from 'socket.io/dist/namespace';
import protectedRequirements, { IProtectRouteRequirements } from '../../middleware/protected';
import { IRequest } from '../../types/request';

export default (requirements: IProtectRouteRequirements) => async (socket: Socket, next: (err?: ExtendedError) => void) => protectedRequirements(requirements)((socket.request as IRequest), ({} as express.Response), (next as express.NextFunction));
