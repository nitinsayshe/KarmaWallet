import { Socket } from 'socket.io';
import { ExtendedError } from 'socket.io/dist/namespace';

export default (socket: Socket, next: (err?: ExtendedError) => void) => {
  console.log(JSON.stringify(socket.handshake.headers), JSON.stringify(socket.data));
  return next();
};
