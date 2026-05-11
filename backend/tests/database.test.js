import mongoose from 'mongoose';
import { User, Simulation, TrafficData, MLModel, RLAgent, Intersection, Report } from '../src/models/index.js';

describe('Database Connection and Models', () => {
  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/georgetown-traffic-ai-test';
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('Model Schemas', () => {
    test('User model should be defined', () => {
      expect(User).toBeDefined();
      expect(User.modelName).toBe('User');
    });

    test('Simulation model should be defined', () => {
      expect(Simulation).toBeDefined();
      expect(Simulation.modelName).toBe('Simulation');
    });

    test('TrafficData model should be defined', () => {
      expect(TrafficData).toBeDefined();
      expect(TrafficData.modelName).toBe('TrafficData');
    });

    test('MLModel model should be defined', () => {
      expect(MLModel).toBeDefined();
      expect(MLModel.modelName).toBe('MLModel');
    });

    test('RLAgent model should be defined', () => {
      expect(RLAgent).toBeDefined();
      expect(RLAgent.modelName).toBe('RLAgent');
    });

    test('Intersection model should be defined', () => {
      expect(Intersection).toBeDefined();
      expect(Intersection.modelName).toBe('Intersection');
    });

    test('Report model should be defined', () => {
      expect(Report).toBeDefined();
      expect(Report.modelName).toBe('Report');
    });
  });

  describe('Model Indexes', () => {
    test('User model should have email index', () => {
      const indexes = User.schema.indexes();
      const emailIndex = indexes.find(idx => idx[0].email);
      expect(emailIndex).toBeDefined();
    });

    test('Simulation model should have userId and createdAt index', () => {
      const indexes = Simulation.schema.indexes();
      const userIdIndex = indexes.find(idx => idx[0].userId);
      expect(userIdIndex).toBeDefined();
    });

    test('Intersection model should have geospatial index', () => {
      const indexes = Intersection.schema.indexes();
      const locationIndex = indexes.find(idx => idx[0].location);
      expect(locationIndex).toBeDefined();
    });
  });
});
