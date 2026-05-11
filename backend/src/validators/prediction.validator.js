import Joi from 'joi';

/**
 * Validation schemas for prediction endpoints
 */

// Training data point schema
const trainingDataPointSchema = Joi.object({
  queue_length: Joi.number().min(0).required(),
  vehicle_arrivals: Joi.number().min(0).required(),
  time_of_day: Joi.number().min(0).max(1).required(),
  weather: Joi.number().min(0).max(2).required()
});

// LSTM training request
export const lstmTrainSchema = Joi.object({
  model_name: Joi.string().min(3).max(100).required(),
  training_data: Joi.array().items(trainingDataPointSchema).min(100).required(),
  epochs: Joi.number().integer().min(1).max(200).default(50),
  batch_size: Joi.number().integer().min(1).max(256).default(32),
  validation_split: Joi.number().min(0.1).max(0.4).default(0.2),
  sequence_length: Joi.number().integer().min(5).max(60).default(15),
  prediction_horizon: Joi.number().integer().min(1).max(30).default(10),
  lstm_units: Joi.array().items(Joi.number().integer().min(8).max(256)).default([64, 32]),
  dropout_rate: Joi.number().min(0).max(0.5).default(0.2)
});

// Random Forest training request
export const rfTrainSchema = Joi.object({
  model_name: Joi.string().min(3).max(100).required(),
  training_data: Joi.array().items(trainingDataPointSchema).min(100).required(),
  n_estimators: Joi.number().integer().min(10).max(500).default(100),
  max_depth: Joi.number().integer().min(5).max(50).allow(null).default(20),
  validation_split: Joi.number().min(0.1).max(0.4).default(0.2),
  prediction_steps: Joi.number().integer().min(1).max(30).default(10),
  optimize_hyperparams: Joi.boolean().default(false)
});

// Prediction request
export const predictionSchema = Joi.object({
  model_name: Joi.string().min(3).max(100).required(),
  input_sequence: Joi.array().items(trainingDataPointSchema).min(1).required()
});

// Model comparison request
export const compareModelsSchema = Joi.object({
  model_names: Joi.array().items(Joi.string()).min(2).required(),
  test_data: Joi.array().items(trainingDataPointSchema).min(10).required(),
  actual_values: Joi.array().items(Joi.number()).min(10).required()
});
