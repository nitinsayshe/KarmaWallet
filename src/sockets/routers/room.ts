import * as RoomController from '../controllers/room';
import { ISocket } from '../types/request';

const path = 'room';

export const msgTest = (socket: ISocket) => {
  socket.on('msg', (msg) => {
    console.log(msg);
    socket.broadcast.emit('msg', msg);
  });
};

export const joinUser = (socket: ISocket) => {
  socket.on(`${path}/join/user`, RoomController.joinUser(socket));
};

export const joinRole = (socket: ISocket) => {
  socket.on(`${path}/join/role`, RoomController.joinRole(socket));
};

// export const joinGroup = (socket: ISocket) => {
//   socket.on(`${path}/join/group`, RoomController.joinGroup(socket));
// };

export const leaveUser = (socket: ISocket) => {
  socket.on(`${path}/leave/user`, RoomController.leaveUser(socket));
};

export const leaveRole = (socket: ISocket) => {
  socket.on(`${path}/leave/role`, RoomController.leaveRole(socket));
};

export const leaveGroup = (socket: ISocket) => {
  socket.on(`${path}/leave/group`, RoomController.leaveGroup(socket));
};

export default (socket: ISocket) => {
  joinRole(socket);
  joinUser(socket);
  // joinGroup(socket);
  leaveUser(socket);
  leaveRole(socket);
  leaveGroup(socket);
  msgTest(socket);
};
