import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

let io: SocketIOServer;

export const initSocket = (httpServer: HttpServer): SocketIOServer => {
  io = new SocketIOServer(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  // Auth middleware for Socket.io
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Missing token'));
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
      (socket as Socket & { userId: string }).userId = payload.userId;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = (socket as Socket & { userId: string }).userId;
    console.log(`Socket connected: ${userId}`);

    // Join a connection room to receive real-time check-ins
    socket.on('join_connection', (connectionId: string) => {
      socket.join(`connection:${connectionId}`);
    });

    socket.on('leave_connection', (connectionId: string) => {
      socket.leave(`connection:${connectionId}`);
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${userId}`);
    });
  });

  return io;
};

export const getIO = (): SocketIOServer | null => {
  return io ?? null;
};
