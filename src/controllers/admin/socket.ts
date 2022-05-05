import { api, error } from '../../services/output';
import { asCustomError } from '../../lib/customError';
import { IRequestHandler } from '../../types/request';

export interface IEmitSocketEventBody {
  room: string;
  event: string;
  data: any;
}

export const emitSocketEvent: IRequestHandler<{}, {}, IEmitSocketEventBody> = async (req, res) => {
  try {
    // need to expose socket server on client to emit events
    // await SocketClient.socket.emit(req.body.room, req.body.event, req.body.data);
    api(req, res, 'Socket event emitted');
  } catch (err) {
    error(req, res, asCustomError(err));
  }
};
