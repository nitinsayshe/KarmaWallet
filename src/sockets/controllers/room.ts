import { IGroup } from '../../models/group';
import { IUserGroup } from '../../models/user';
import { ISocket } from '../types/request';

interface ISocketRequestData {
  room: string;
}

export const joinUser = (socket: ISocket) => async ({ room }: ISocketRequestData) => {
  console.log('>>>>> controller:joinUser', room, socket?.request?.requestor?._id);
  const roomPrefix = 'user';
  const uid = socket?.request?.requestor?._id;
  if (!!uid && room === uid.toString()) {
    const roomName = `${roomPrefix}/${uid}`;
    socket.join(roomName);
    console.log(`${uid} joined ${roomName}`);
  } else {
    console.log(`${uid || 'guest'} failed to join ${roomPrefix}/${room}`);
  }
};

export const joinRole = (socket: ISocket) => async ({ room }: ISocketRequestData) => {
  const roomPrefix = 'role';
  const role = socket?.request?.requestor?.role;
  const uid = socket?.data?.requestor?._id;
  if (room === role) {
    const roomName = `${roomPrefix}/${role}`;
    socket.join(roomName);
    console.log(`${uid} joined ${roomName}`);
  } else {
    console.log(`${uid || 'guest'} failed to join ${roomPrefix}/${room}`);
  }
};

export const joinGroup = (socket: ISocket) => async ({ room }: ISocketRequestData) => {
  const roomPrefix = 'group';
  const groups = socket?.request?.requestor?.groups || [];
  const uid = socket?.request?.requestor?._id;
  if (groups.length && groups.find(({ group }: IUserGroup) => (group as IGroup).name === room)) {
    const roomName = `${roomPrefix}/${room}`;
    socket.join(roomName);
    console.log(`${uid} joined ${roomName}`);
  } else {
    console.log(`${uid || 'guest'} failed to join ${roomPrefix}/${room}`);
  }
};

export const leaveUser = (socket: ISocket) => async ({ room }: ISocketRequestData) => {
  const roomPrefix = 'user';
  const roomName = `${roomPrefix}/${room}`;
  socket.leave(roomName);
  const uid = socket?.request?.requestor?._id || 'guest';
  console.log(`${uid} left ${roomName}`);
};

export const leaveRole = (socket: ISocket) => async ({ room }: ISocketRequestData) => {
  const roomPrefix = 'role';
  const roomName = `${roomPrefix}/${room}`;
  socket.leave(roomName);
  const uid = socket?.request?.requestor?._id || 'guest';
  console.log(`${uid} left ${roomName}`);
};

export const leaveGroup = (socket: ISocket) => async ({ room }: ISocketRequestData) => {
  const roomPrefix = 'group';
  const roomName = `${roomPrefix}/${room}`;
  socket.leave(roomName);
  const uid = socket?.request?.requestor?._id || 'guest';
  console.log(`${uid} left ${roomName}`);
};
