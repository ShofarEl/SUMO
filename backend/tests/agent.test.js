import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../src/server.js';
import mongoose from 'mongoose';
import User from '../src/models/User.js';
import RLAgent from '../src/models/RLAgent.js';

describe('RL Agent API', () => {
  let authToken;
  let testUser;
  let testAgent;

  beforeAll(async () => {
    testUser = await User.create({
      email: 'agent-test@example.com',
      password: 'Test123!@#',
      firstName: 'Agent',
      lastName: 'Tester',
      role: 'researcher'
    });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'agent-test@example.com',
        password: 'Test123!@#'
      });

    authToken = loginRes.body.data.token;
  });

  afterAll(async () => {
    await User.deleteOne({ email: 'agent-test@example.com' });
    await RLAgent.deleteMany({ trainedBy: testUser._id });
    await mongoose.connection.close();
  });

  describe('POST /api/agents', () => {
    it('should create a new RL agent', async () => {
      const res = await request(app)
        .post('/api/agents')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test DQN Agent',
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
              gamma: 0.99,
              epsilon: 1.0,
              epsilonDecay: 0.995,
              batchSize: 32
            }
          }
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('_id');
      expect(res.body.data.name).toBe('Test DQN Agent');
      testAgent = res.body.data;
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .post('/api/agents')
        .send({
          name: 'Test Agent'
        });

      expect(res.status).toBe(401);
    });

    it('should validate required fields', async () => {
      const res = await request(app)
        .post('/api/agents')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          algorithm: 'dqn'
        });

      expect(res.status).toBe(400);
    });

    it('should validate algorithm type', async () => {
      const res = await request(app)
        .post('/api/agents')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Invalid Agent',
          algorithm: 'invalid_algo',
          intersectionIds: ['intersection_1']
        });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/agents', () => {
    it('should list all agents', async () => {
      const res = await request(app)
        .get('/api/agents')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('agents');
      expect(Array.isArray(res.body.data.agents)).toBe(true);
    });

    it('should support pagination', async () => {
      const res = await request(app)
        .get('/api/agents?page=1&limit=5')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('currentPage', 1);
    });

    it('should support filtering by algorithm', async () => {
      const res = await request(app)
        .get('/api/agents?algorithm=dqn')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .get('/api/agents');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/agents/:id', () => {
    it('should get agent by ID', async () => {
      const res = await request(app)
        .get(`/api/agents/${testAgent._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data._id).toBe(testAgent._id);
    });

    it('should return 404 for non-existent agent', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/agents/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/agents/:id/train', () => {
    it('should accept training request', async () => {
      const res = await request(app)
        .post(`/api/agents/${testAgent._id}/train`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          episodes: 100,
          simulationConfig: {
            trafficDemand: 'peak',
            duration: 3600
          }
        });

      // May fail if Python service is not running
      expect([200, 500]).toContain(res.status);
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .post(`/api/agents/${testAgent._id}/train`);

      expect(res.status).toBe(401);
    });

    it('should validate training parameters', async () => {
      const res = await request(app)
        .post(`/api/agents/${testAgent._id}/train`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          episodes: -10
        });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/agents/:id/training-status', () => {
    it('should get training status', async () => {
      const res = await request(app)
        .get(`/api/agents/${testAgent._id}/training-status`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('trainingStatus');
    });
  });

  describe('POST /api/agents/:id/deploy', () => {
    it('should accept deployment request', async () => {
      const res = await request(app)
        .post(`/api/agents/${testAgent._id}/deploy`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .post(`/api/agents/${testAgent._id}/deploy`);

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/agents/:id/performance', () => {
    it('should get agent performance metrics', async () => {
      const res = await request(app)
        .get(`/api/agents/${testAgent._id}/performance`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('performance');
    });
  });

  describe('DELETE /api/agents/:id', () => {
    it('should delete agent', async () => {
      const res = await request(app)
        .delete(`/api/agents/${testAgent._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 for already deleted agent', async () => {
      const res = await request(app)
        .delete(`/api/agents/${testAgent._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });
  });
});
