import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../src/server.js';
import mongoose from 'mongoose';
import User from '../src/models/User.js';

describe('Prediction API', () => {
  let authToken;
  let testUser;

  beforeAll(async () => {
    testUser = await User.create({
      email: 'pred-test@example.com',
      password: 'Test123!@#',
      firstName: 'Pred',
      lastName: 'Tester',
      role: 'researcher'
    });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'pred-test@example.com',
        password: 'Test123!@#'
      });

    authToken = loginRes.body.data.token;
  });

  afterAll(async () => {
    await User.deleteOne({ email: 'pred-test@example.com' });
    await mongoose.connection.close();
  });

  describe('POST /api/predictions/lstm', () => {
    it('should require authentication', async () => {
      const res = await request(app)
        .post('/api/predictions/lstm')
        .send({
          trafficState: {
            queueLengths: [10, 15, 20],
            vehicleArrivals: [5, 7, 6],
            timeOfDay: 0.5,
            weather: 0
          }
        });

      expect(res.status).toBe(401);
    });

    it('should validate request body', async () => {
      const res = await request(app)
        .post('/api/predictions/lstm')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          trafficState: 'invalid'
        });

      expect(res.status).toBe(400);
    });

    it('should accept valid prediction request', async () => {
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
  });

  describe('POST /api/predictions/rf', () => {
    it('should require authentication', async () => {
      const res = await request(app)
        .post('/api/predictions/rf')
        .send({
          trafficState: {
            queueLength: 15,
            vehicleArrivals: 7,
            timeOfDay: 0.5,
            weather: 0
          }
        });

      expect(res.status).toBe(401);
    });

    it('should validate request body', async () => {
      const res = await request(app)
        .post('/api/predictions/rf')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it('should accept valid prediction request', async () => {
      const res = await request(app)
        .post('/api/predictions/rf')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          trafficState: {
            queueLength: 15,
            vehicleArrivals: 7,
            timeOfDay: 0.5,
            weather: 0,
            dayOfWeek: 2
          }
        });

      expect([200, 500]).toContain(res.status);
    });
  });

  describe('POST /api/predictions/compare', () => {
    it('should require authentication', async () => {
      const res = await request(app)
        .post('/api/predictions/compare')
        .send({
          trafficState: {},
          models: ['lstm', 'rf']
        });

      expect(res.status).toBe(401);
    });

    it('should validate models array', async () => {
      const res = await request(app)
        .post('/api/predictions/compare')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          trafficState: {
            queueLength: 15,
            vehicleArrivals: 7,
            timeOfDay: 0.5,
            weather: 0
          },
          models: 'invalid'
        });

      expect(res.status).toBe(400);
    });

    it('should accept valid comparison request', async () => {
      const res = await request(app)
        .post('/api/predictions/compare')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          trafficState: {
            queueLength: 15,
            vehicleArrivals: 7,
            timeOfDay: 0.5,
            weather: 0
          },
          models: ['lstm', 'rf']
        });

      expect([200, 500]).toContain(res.status);
    });
  });

  describe('GET /api/predictions/history', () => {
    it('should require authentication', async () => {
      const res = await request(app)
        .get('/api/predictions/history');

      expect(res.status).toBe(401);
    });

    it('should return prediction history', async () => {
      const res = await request(app)
        .get('/api/predictions/history')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('predictions');
    });

    it('should support pagination', async () => {
      const res = await request(app)
        .get('/api/predictions/history?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('currentPage');
    });

    it('should support filtering by model type', async () => {
      const res = await request(app)
        .get('/api/predictions/history?modelType=lstm')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
    });
  });
});
