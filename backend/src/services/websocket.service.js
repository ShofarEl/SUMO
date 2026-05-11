import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger.js';
import User from '../models/User.js';

let io;

/**
 * Initialize WebSocket server
 * @param {Object} server - HTTP server instance
 */
export const initializeWebSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000'],
      credentials: true,
      methods: ['GET', 'POST']
    },
    transports: ['websocket', 'polling']
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from database
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        return next(new Error('User not found'));
      }

      if (!user.isActive) {
        return next(new Error('User account is inactive'));
      }

      // Attach user to socket
      socket.user = user;
      next();
    } catch (error) {
      logger.error(`WebSocket authentication error: ${error.message}`);
      next(new Error('Authentication failed'));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    logger.info(`WebSocket client connected: ${socket.id} (User: ${socket.user.email})`);

    // Handle simulation subscription
    socket.on('subscribe_simulation', (data) => {
      const { simulationId } = data;
      
      if (!simulationId) {
        socket.emit('error', { message: 'Simulation ID is required' });
        return;
      }

      const room = `simulation:${simulationId}`;
      socket.join(room);
      logger.info(`Client ${socket.id} subscribed to ${room}`);

      socket.emit('subscribed', { 
        simulationId, 
        message: 'Successfully subscribed to simulation updates' 
      });
    });

    // Handle simulation unsubscription
    socket.on('unsubscribe_simulation', (data) => {
      const { simulationId } = data;
      
      if (!simulationId) {
        socket.emit('error', { message: 'Simulation ID is required' });
        return;
      }

      const room = `simulation:${simulationId}`;
      socket.leave(room);
      logger.info(`Client ${socket.id} unsubscribed from ${room}`);

      socket.emit('unsubscribed', { 
        simulationId, 
        message: 'Successfully unsubscribed from simulation updates' 
      });
    });

    // Handle training subscription
    socket.on('subscribe_training', (data) => {
      const { agentId } = data;
      
      if (!agentId) {
        socket.emit('error', { message: 'Agent ID is required' });
        return;
      }

      const room = `training:${agentId}`;
      socket.join(room);
      logger.info(`Client ${socket.id} subscribed to ${room}`);

      socket.emit('subscribed', { 
        agentId, 
        message: 'Successfully subscribed to training updates' 
      });
    });

    // Handle training unsubscription
    socket.on('unsubscribe_training', (data) => {
      const { agentId } = data;
      
      if (!agentId) {
        socket.emit('error', { message: 'Agent ID is required' });
        return;
      }

      const room = `training:${agentId}`;
      socket.leave(room);
      logger.info(`Client ${socket.id} unsubscribed from ${room}`);

      socket.emit('unsubscribed', { 
        agentId, 
        message: 'Successfully unsubscribed from training updates' 
      });
    });

    // Handle request for live traffic data
    socket.on('request_live_traffic', (data) => {
      const { intersectionId } = data;
      
      if (intersectionId) {
        const room = `traffic:${intersectionId}`;
        socket.join(room);
        logger.info(`Client ${socket.id} subscribed to traffic updates for intersection ${intersectionId}`);
      } else {
        // Subscribe to all traffic updates
        socket.join('traffic:all');
        logger.info(`Client ${socket.id} subscribed to all traffic updates`);
      }
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      logger.info(`WebSocket client disconnected: ${socket.id} (Reason: ${reason})`);
    });

    // Handle errors
    socket.on('error', (error) => {
      logger.error(`WebSocket error for client ${socket.id}: ${error.message}`);
    });
  });

  logger.info('WebSocket server initialized');

  return io;
};

/**
 * Get Socket.io instance
 */
export const getIO = () => {
  if (!io) {
    throw new Error('WebSocket server not initialized');
  }
  return io;
};

/**
 * Emit simulation update to subscribed clients
 * @param {string} simulationId - Simulation ID
 * @param {Object} data - Update data
 */
export const emitSimulationUpdate = (simulationId, data) => {
  if (!io) return;

  const room = `simulation:${simulationId}`;
  io.to(room).emit('simulation_update', {
    simulationId,
    timestamp: new Date().toISOString(),
    ...data
  });

  logger.debug(`Emitted simulation update to room ${room}`);
};

/**
 * Emit training update to subscribed clients
 * @param {string} agentId - Agent ID
 * @param {Object} data - Training data
 */
export const emitTrainingUpdate = (agentId, data) => {
  if (!io) return;

  const room = `training:${agentId}`;
  io.to(room).emit('training_update', {
    agentId,
    timestamp: new Date().toISOString(),
    ...data
  });

  logger.debug(`Emitted training update to room ${room}`);
};

/**
 * Emit traffic update to subscribed clients
 * @param {string} intersectionId - Intersection ID (optional)
 * @param {Object} data - Traffic data
 */
export const emitTrafficUpdate = (intersectionId, data) => {
  if (!io) return;

  if (intersectionId) {
    const room = `traffic:${intersectionId}`;
    io.to(room).emit('traffic_update', {
      intersectionId,
      timestamp: new Date().toISOString(),
      ...data
    });
  } else {
    // Broadcast to all traffic subscribers
    io.to('traffic:all').emit('traffic_update', {
      timestamp: new Date().toISOString(),
      ...data
    });
  }

  logger.debug(`Emitted traffic update`);
};

/**
 * Emit error to specific client
 * @param {string} socketId - Socket ID
 * @param {Object} error - Error data
 */
export const emitError = (socketId, error) => {
  if (!io) return;

  io.to(socketId).emit('error', {
    timestamp: new Date().toISOString(),
    ...error
  });
};

/**
 * Get connected clients count
 */
export const getConnectedClientsCount = () => {
  if (!io) return 0;
  return io.engine.clientsCount;
};

/**
 * Get clients in a specific room
 * @param {string} room - Room name
 */
export const getClientsInRoom = async (room) => {
  if (!io) return [];
  const sockets = await io.in(room).fetchSockets();
  return sockets.map(socket => ({
    id: socket.id,
    userId: socket.user?._id,
    email: socket.user?.email
  }));
};

export default {
  initializeWebSocket,
  getIO,
  emitSimulationUpdate,
  emitTrainingUpdate,
  emitTrafficUpdate,
  emitError,
  getConnectedClientsCount,
  getClientsInRoom
};
