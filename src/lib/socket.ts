import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const getSocket = () => {
  // Only create socket on client-side
  if (typeof window === 'undefined') {
    return null;
  }
  
  if (!socket) {
    socket = io('http://localhost:9002', {
      autoConnect: false,
    });
  }
  return socket;
};

export const connectSocket = () => {
  const socket = getSocket();
  if (socket && !socket.connected) {
    socket.connect();
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
  }
};
