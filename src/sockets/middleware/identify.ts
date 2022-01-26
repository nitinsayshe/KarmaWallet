import express from 'express';
import { Socket } from 'socket.io';
import { ExtendedError } from 'socket.io/dist/namespace';
import identify from '../../middleware/identify';

export default () => async (socket: Socket, next: (err?: ExtendedError) => void) => identify((socket.request as express.Request), ({} as express.Response), (next as express.NextFunction));
