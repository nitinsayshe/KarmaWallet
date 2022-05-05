import { api, error } from '../../services/output';
import { asCustomError } from '../../lib/customError';
import { IRequestHandler } from '../../types/request';
import { SocketClient } from '../../clients/socket';
import { ISocketEmitConfig } from '../../sockets/server';

export const emitSocketEvent: IRequestHandler<{}, {}, ISocketEmitConfig> = async (req, res) => {
  try {
    SocketClient.socket.emit(req.body);

    api(req, res, 'Socket event emitted');
  } catch (err) {
    error(req, res, asCustomError(err));
  }
};
