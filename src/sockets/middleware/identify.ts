import { Request, Response, NextFunction } from 'express-serve-static-core';
import { Socket } from 'socket.io';
import { ExtendedError } from 'socket.io/dist/namespace';
import identify from '../../middleware/identify';

export default () => async (socket: Socket, next: (err?: ExtendedError) => void) => identify((socket.request as unknown as Request), ({} as Response), (next as NextFunction));
