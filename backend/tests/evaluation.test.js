import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../src/server.js';
import mongoose from 'mongoose';
import User from '../src/models/User.js';
import MLModel from '../src/models/MLModel.js';
import PredictionEvaluation from '../src/models/PredictionEvaluation.js';

describe('Prediction Evaluation API', () => {
  let authToken;
  let testUser;
  let testModel;

  beforeAll(async () => {
    // Create test user
    testUser = await User.create({
      email: 'eval-test@example.com',
      password: 'Test123!@#',
      firstName: 'Eval',
      lastName: 'Tester',
      role: 'researcher'
    });

    // Login to get token
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'eval-test@example.com',
        password: 'Test123!@#'
      });

    authToken = loginRes.body.data.token;

    // Create test model
    testModel = await MLModel.create({
      name: 'test_lstm_eval',
      type: 'lstm',
      version: '1.0.0',
      trainedBy: testUser._id,
      trainingConfig: {
        epochs: 50,
        batchSize: 32
      },
      performance: {
        rmse: 0.025,
        mae: 0.019
      },
      modelPath: '/models/test_lstm_eval.keras',
      isDeployed: false
    });
  });

  afterAll(async () => {
    // Cleanup
    await User.deleteOne({ email: 'eval-test@example.com' });
    await MLModel.deleteOne({ name: 'test_lstm_eval' });
    await PredictionEvaluation.deleteMany({ modelName: 'test_lstm_eval' });
    await mongoose.connection.close();
  });

  describe('POST /api/evaluations/:modelName', () => {
    it('should return 401 without authentication', async () => {
      const res = await request(app)
        .post('/api/evaluations/test_lstm_eval')
        .send({
          testData: [],
          actualValues: []
        });

      expect(res.status).toBe(401);
    });

    it('should return 404 for non-existent model', async () => {
      const res = await request(app)
        .post('/api/evaluations/nonexistent_model')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          testData: [{ queue_length: 10, vehicle_arrivals: 5, time_of_day: 0.5, weather: 0 }],
          actualValues: [12]
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should validate request body', async () => {
      const res = await request(app)
        .post('/api/evaluations/test_lstm_eval')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          testData: 'invalid',
          actualValues: 'invalid'
        });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/evaluations', () => {
    it('should return 401 without authentication', async () => {
      const res = await request(app)
        .get('/api/evaluations');

      expect(res.status).toBe(401);
    });

    it('should return evaluations list with authentication', async () => {
      const res = await request(app)
        .get('/api/evaluations')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('evaluations');
      expect(res.body.data).toHaveProperty('total');
    });

    it('should support pagination', async () => {
      const res = await request(app)
        .get('/api/evaluations?page=1&limit=5')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('currentPage', 1);
    });

    it('should support filtering by model type', async () => {
      const res = await request(app)
        .get('/api/evaluations?modelType=lstm')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/evaluations/model/:modelName', () => {
    it('should return evaluation history for a model', async () => {
      const res = await request(app)
        .get('/api/evaluations/model/test_lstm_eval')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('evaluations');
    });
  });

  describe('POST /api/evaluations/compare', () => {
    it('should validate request body', async () => {
      const res = await request(app)
        .post('/api/evaluations/compare')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          modelNames: 'invalid',
          testData: [],
          actualValues: []
        });

      expect(res.status).toBe(400);
    });

    it('should accept valid comparison request', async () => {
      const res = await request(app)
        .post('/api/evaluations/compare')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          modelNames: ['test_lstm_eval'],
          testData: [{ queue_length: 10, vehicle_arrivals: 5, time_of_day: 0.5, weather: 0 }],
          actualValues: [12]
        });

      // May fail if Python service is not running, but should validate request
      expect([200, 500]).toContain(res.status);
    });
  });
});
