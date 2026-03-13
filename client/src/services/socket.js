import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace('/api', '');

let socket = null;

export const connectSocket = (opts = {}) => {
  if (socket) return socket;
  socket = io(SOCKET_URL, { transports: ['websocket'] });
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = () => socket;

export default {
  connectSocket,
  disconnectSocket,
  getSocket,
};
