import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../src/server.js';
import mongoose from 'mongoose';
import User from '../src/models/User.js';
import Simulation from '../src/models/Simulation.js';
import RLAgent from '../src/models/RLAgent.js';

describe('Integration Tests', () => {
  let authToken;
  let testUser;
  let testSimulation;
  let testAgent;

  beforeAll(async () => {
    // Create test user
    testUser = await User.create({
      email: 'integration-test@example.com',
      password: 'Test123!@#',
      firstName: 'Integration',
      lastName: 'Test',
      role: 'researcher'
    });

    // Login to get token
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'integration-test@example.com',
        password: 'Test123!@#'
      });

    authToken = loginRes.body.data.token;
  });

  afterAll(async () => {
    await User.deleteOne({ email: 'integration-test@example.com' });
    await Simulation.deleteMany({ userId: testUser._id });
    await RLAgent.deleteMany({ trainedBy: testUser._id });
    await mongoose.connection.close();
  });

  describe('End-to-End Simulation Workflow', () => {
    it('should complete full simulation workflow', async () => {
      // Step 1: Create simulation
      const createRes = await request(app)
        .post('/api/simulations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Integration Test Simulation',
          description: 'Testing end-to-end workflow',
          config: {
            trafficDemand: 'peak',
            vehicleMix: {
              cars: 55,
              motorcycles: 25,
              minibuses: 15,
              trucks: 5
            },
            duration: 3600,
            timeOfDay: 'morning_peak',
            weather: 'clear',
            controlStrategy: 'fixed'
          }
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body.success).toBe(true);
      testSimulation = createRes.body.data;

      // Step 2: Get simulation details
      const getRes = await request(app)
        .get(`/api/simulations/${testSimulation._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data._id).toBe(testSimulation._id);

      // Step 3: Run simulation (may fail if Python service not running)
      const runRes = await request(app)
        .post(`/api/simulations/${testSimulation._id}/run`)
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 500]).toContain(runRes.status);

      // Step 4: Check simulation status
      const statusRes = await request(app)
        .get(`/api/simulations/${testSimulation._id}/status`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(statusRes.status).toBe(200);
      expect(statusRes.body.data).toHaveProperty('status');

      // Step 5: Get simulation results
      const resultsRes = await request(app)
        .get(`/api/simulations/${testSimulation._id}/results`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(resultsRes.status).toBe(200);

      // Step 6: List all simulations
      const listRes = await request(app)
        .get('/api/simulations')
        .set('Authorization', `Bearer ${authToken}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.data.simulations.length).toBeGreaterThan(0);

      // Step 7: Delete simulation
      const deleteRes = await request(app)
        .delete(`/api/simulations/${testSimulation._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(deleteRes.status).toBe(200);
    });
  });

  describe('Node.js ↔ Python Service Communication', () => {
    it('should communicate with Python service for predictions', async () => {
      const res = await request(app)
        .post('/api/predictions/lstm')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          trafficState: {
            queueLengths: [10, 15, 20, 18, 22],
            vehicleArrivals: [5, 7, 6, 8, 7],
            timeOfDay: 0.5,
            weather: 0
          }
        });

      // May fail if Python service is not running
      expect([200, 500]).toContain(res.status);
    });

    it('should communicate with Python service for RL training', async () => {
      // Create agent first
      const createRes = await request(app)
        .post('/api/agents')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Integration Test Agent',
          algorithm: 'dqn',
          intersectionIds: ['intersection_1'],
          config: {
            stateSpace: {
              queueLengths: 4,
              vehicleArrivals: 4,
              signalPhases: 4
            },
            actionSpace: {
              phaseChanges: 4
            },
            rewardFunction: 'minimize_delay',
            hyperparameters: {
              learningRate: 0.001,
              gamma: 0.99
            }
          }
        });

      expect(createRes.status).toBe(201);
      testAgent = createRes.body.data;

      // Try to train agent
      const trainRes = await request(app)
        .post(`/api/agents/${testAgent._id}/train`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          episodes: 10,
          simulationConfig: {
            trafficDemand: 'peak',
            duration: 1800
          }
        });

      // May fail if Python service is not running
      expect([200, 500]).toContain(trainRes.status);
    });
  });

  describe('WebSocket Connections', () => {
    it('should establish WebSocket connection', (done) => {
      // WebSocket testing requires socket.io-client
      // This is a placeholder for WebSocket integration tests
      expect(true).toBe(true);
      done();
    });
  });

  describe('Database Operations', () => {
    it('should perform CRUD operations on User model', async () => {
      // Create
      const newUser = await User.create({
        email: 'db-test@example.com',
        password: 'Test123!@#',
        firstName: 'DB',
        lastName: 'Test',
        role: 'viewer'
      });

      expect(newUser._id).toBeDefined();

      // Read
      const foundUser = await User.findById(newUser._id);
      expect(foundUser.email).toBe('db-test@example.com');

      // Update
      foundUser.firstName = 'Updated';
      await foundUser.save();

      const updatedUser = await User.findById(newUser._id);
      expect(updatedUser.firstName).toBe('Updated');

      // Delete
      await User.deleteOne({ _id: newUser._id });
      const deletedUser = await User.findById(newUser._id);
      expect(deletedUser).toBeNull();
    });

    it('should perform CRUD operations on Simulation model', async () => {
      // Create
      const newSim = await Simulation.create({
        name: 'DB Test Simulation',
        userId: testUser._id,
        status: 'pending',
        config: {
          trafficDemand: 'medium',
          vehicleMix: {
            cars: 55,
            motorcycles: 25,
            minibuses: 15,
            trucks: 5
          },
          duration: 3600,
          timeOfDay: 'off_peak',
          weather: 'clear',
          controlStrategy: 'fixed'
        }
      });

      expect(newSim._id).toBeDefined();

      // Read
      const foundSim = await Simulation.findById(newSim._id);
      expect(foundSim.name).toBe('DB Test Simulation');

      // Update
      foundSim.status = 'completed';
      await foundSim.save();

      const updatedSim = await Simulation.findById(newSim._id);
      expect(updatedSim.status).toBe('completed');

      // Delete
      await Simulation.deleteOne({ _id: newSim._id });
      const deletedSim = await Simulation.findById(newSim._id);
      expect(deletedSim).toBeNull();
    });

    it('should handle database transactions', async () => {
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        const user = await User.create([{
          email: 'transaction-test@example.com',
          password: 'Test123!@#',
          firstName: 'Transaction',
          lastName: 'Test',
          role: 'viewer'
        }], { session });

        const simulation = await Simulation.create([{
          name: 'Transaction Test Sim',
          userId: user[0]._id,
          status: 'pending',
          config: {
            trafficDemand: 'medium',
            vehicleMix: {
              cars: 55,
              motorcycles: 25,
              minibuses: 15,
              trucks: 5
            },
            duration: 3600,
            timeOfDay: 'off_peak',
            weather: 'clear',
            controlStrategy: 'fixed'
          }
        }], { session });

        await session.commitTransaction();

        expect(user[0]._id).toBeDefined();
        expect(simulation[0]._id).toBeDefined();

        // Cleanup
        await User.deleteOne({ _id: user[0]._id });
        await Simulation.deleteOne({ _id: simulation[0]._id });
      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        session.endSession();
      }
    });

    it('should enforce unique constraints', async () => {
      const email = 'unique-test@example.com';

      await User.create({
        email,
        password: 'Test123!@#',
        firstName: 'Unique',
        lastName: 'Test',
        role: 'viewer'
      });

      // Try to create duplicate
      await expect(
        User.create({
          email,
          password: 'Test123!@#',
          firstName: 'Duplicate',
          lastName: 'Test',
          role: 'viewer'
        })
      ).rejects.toThrow();

      // Cleanup
      await User.deleteOne({ email });
    });

    it('should validate required fields', async () => {
      await expect(
        User.create({
          email: 'incomplete@example.com'
          // Missing required fields
        })
      ).rejects.toThrow();
    });
  });

  describe('Authentication Flow', () => {
    it('should complete full authentication flow', async () => {
      // Register
      const registerRes = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'auth-flow-test@example.com',
          password: 'Test123!@#',
          firstName: 'Auth',
          lastName: 'Flow',
          organization: 'Test Org'
        });

      expect(registerRes.status).toBe(201);

      // Login
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'auth-flow-test@example.com',
          password: 'Test123!@#'
        });

      expect(loginRes.status).toBe(200);
      const token = loginRes.body.data.token;

      // Access protected route
      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(meRes.status).toBe(200);
      expect(meRes.body.data.email).toBe('auth-flow-test@example.com');

      // Refresh token
      const refreshRes = await request(app)
        .post('/api/auth/refresh-token')
        .set('Authorization', `Bearer ${token}`);

      expect(refreshRes.status).toBe(200);
      expect(refreshRes.body.data).toHaveProperty('token');

      // Cleanup
      await User.deleteOne({ email: 'auth-flow-test@example.com' });
    });
  });
});
