import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../src/server.js';
import mongoose from 'mongoose';
import User from '../src/models/User.js';
import Simulation from '../src/models/Simulation.js';

describe('Simulation API', () => {
  let authToken;
  let testUser;
  let testSimulation;

  beforeAll(async () => {
    // Create test user
    testUser = await User.create({
      email: 'sim-test@example.com',
      password: 'Test123!@#',
      firstName: 'Sim',
      lastName: 'Tester',
      role: 'researcher'
    });

    // Login to get token
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'sim-test@example.com',
        password: 'Test123!@#'
      });

    authToken = loginRes.body.data.token;
  });

  afterAll(async () => {
    await User.deleteOne({ email: 'sim-test@example.com' });
    await Simulation.deleteMany({ userId: testUser._id });
    await mongoose.connection.close();
  });

  describe('POST /api/simulations', () => {
    it('should create a new simulation', async () => {
      const res = await request(app)
        .post('/api/simulations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Simulation',
          description: 'Test description',
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

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('_id');
      expect(res.body.data.name).toBe('Test Simulation');
      testSimulation = res.body.data;
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .post('/api/simulations')
        .send({
          name: 'Test Simulation'
        });

      expect(res.status).toBe(401);
    });

    it('should validate required fields', async () => {
      const res = await request(app)
        .post('/api/simulations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: 'Missing name'
        });

      expect(res.status).toBe(400);
    });

    it('should validate vehicle mix sum', async () => {
      const res = await request(app)
        .post('/api/simulations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Invalid Mix',
          config: {
            vehicleMix: {
              cars: 50,
              motorcycles: 25,
              minibuses: 15,
              trucks: 5
            }
          }
        });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/simulations', () => {
    it('should list simulations with pagination', async () => {
      const res = await request(app)
        .get('/api/simulations')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('simulations');
      expect(res.body.data).toHaveProperty('total');
      expect(Array.isArray(res.body.data.simulations)).toBe(true);
    });

    it('should support pagination parameters', async () => {
      const res = await request(app)
        .get('/api/simulations?page=1&limit=5')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('currentPage', 1);
      expect(res.body.data).toHaveProperty('totalPages');
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .get('/api/simulations');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/simulations/:id', () => {
    it('should get simulation by ID', async () => {
      const res = await request(app)
        .get(`/api/simulations/${testSimulation._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data._id).toBe(testSimulation._id);
    });

    it('should return 404 for non-existent simulation', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/simulations/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });

    it('should validate ObjectId format', async () => {
      const res = await request(app)
        .get('/api/simulations/invalid-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/simulations/:id/run', () => {
    it('should accept run request', async () => {
      const res = await request(app)
        .post(`/api/simulations/${testSimulation._id}/run`)
        .set('Authorization', `Bearer ${authToken}`);

      // May fail if Python service is not running
      expect([200, 500]).toContain(res.status);
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .post(`/api/simulations/${testSimulation._id}/run`);

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/simulations/:id/status', () => {
    it('should get simulation status', async () => {
      const res = await request(app)
        .get(`/api/simulations/${testSimulation._id}/status`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('status');
    });
  });

  describe('GET /api/simulations/:id/results', () => {
    it('should get simulation results', async () => {
      const res = await request(app)
        .get(`/api/simulations/${testSimulation._id}/results`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('DELETE /api/simulations/:id', () => {
    it('should delete simulation', async () => {
      const res = await request(app)
        .delete(`/api/simulations/${testSimulation._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 for already deleted simulation', async () => {
      const res = await request(app)
        .delete(`/api/simulations/${testSimulation._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });
  });
});
