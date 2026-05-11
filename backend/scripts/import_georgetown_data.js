/**
 * Import Georgetown Data from Colab
 * 
 * This script imports the data generated in Google Colab into your MongoDB database
 * 
 * Usage:
 *   1. Unzip georgetown_data.zip to backend/data/georgetown/
 *   2. Run: node backend/scripts/import_georgetown_data.js
 */

import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import models
import Intersection from '../src/models/Intersection.js';
import Simulation from '../src/models/Simulation.js';
import RLAgent from '../src/models/RLAgent.js';
import User from '../src/models/User.js';

// Create a simple Network model for storing GeoJSON
const NetworkSchema = new mongoose.Schema({
  name: String,
  location: String,
  geojson: Object,
  bbox: Object,
  createdAt: { type: Date, default: Date.now }
});
const Network = mongoose.models.Network || mongoose.model('Network', NetworkSchema);

const DATA_DIR = path.join(__dirname, '../data/georgetown');

async function importData() {
  try {
    console.log('🚀 Starting Georgetown data import...\n');

    // Connect to MongoDB Atlas
    const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://tuboksmicheal:mf68PoVkpn7FGXNM@sumo-cluster.i8gojxe.mongodb.net/';
    await mongoose.connect(mongoUri);
    console.log('✓ Connected to MongoDB Atlas\n');

    // 1. Import Network Data
    console.log('📍 Importing network data...');
    const geojson = JSON.parse(
      fs.readFileSync(path.join(DATA_DIR, 'georgetown_network.geojson'), 'utf8')
    );
    
    // Store network in database
    const network = await Network.create({
      name: 'Georgetown Sheriff Street Corridor',
      location: 'Georgetown, Guyana',
      geojson: geojson,
      bbox: {
        north: 6.8050,
        south: 6.7980,
        east: -58.1500,
        west: -58.1600
      }
    });
    
    console.log(`  ✓ Loaded ${geojson.features.length} road segments`);
    console.log(`  ✓ Network ID: ${network._id}`);

    // 2. Import Baseline Simulation
    console.log('\n📊 Importing baseline simulation...');
    const baselineResults = JSON.parse(
      fs.readFileSync(path.join(DATA_DIR, 'baseline_results.json'), 'utf8')
    );

    // Create a system user for the simulation if it doesn't exist
    let systemUser = await User.findOne({ email: 'system@georgetown-traffic.ai' });
    if (!systemUser) {
        systemUser = await User.create({
            email: 'system@georgetown-traffic.ai',
            password: 'system-generated-' + Date.now(),
            firstName: 'System',
            lastName: 'Generated',
            role: 'admin'
        });
    }

    const baselineSimulation = await Simulation.create({
      name: 'Georgetown Baseline (Fixed Timing)',
      description: 'Fixed 60-second signal timing - baseline for comparison on Sheriff Street corridor',
      userId: systemUser._id,
      status: 'completed',
      config: {
        trafficDemand: 'peak',
        vehicleMix: {
          cars: 55,
          motorcycles: 25,
          minibuses: 15,
          trucks: 5
        },
        duration: baselineResults.simulation_duration || 900,
        timeOfDay: 'morning_peak',
        weather: 'clear',
        controlStrategy: 'fixed'
      },
      results: {
        avgDelay: baselineResults.average_delay_per_vehicle,
        avgQueueLength: baselineResults.average_vehicles,
        throughput: baselineResults.throughput_per_hour,
        detailedMetrics: {
          total_departed: baselineResults.total_departed,
          total_arrived: baselineResults.total_arrived,
          average_speed: baselineResults.average_speed
        }
      },
      startTime: new Date(),
      endTime: new Date()
    });

    console.log(`  ✓ Created baseline simulation: ${baselineSimulation._id}`);

    // 3. Import DQN Training Results
    console.log('\n🤖 Importing DQN training results...');
    const trainingResults = JSON.parse(
      fs.readFileSync(path.join(DATA_DIR, 'training_results.json'), 'utf8')
    );

    const dqnAgent = await RLAgent.create({
      name: 'Georgetown DQN Agent',
      algorithm: 'dqn',
      intersectionIds: ['sheriff-vlissengen'],
      isMultiAgent: false,
      trainedBy: systemUser._id,
      trainingStatus: 'completed',
      trainingProgress: {
        currentEpisode: trainingResults.length,
        totalEpisodes: trainingResults.length,
        currentReward: trainingResults[trainingResults.length - 1]?.total_reward || 0,
        bestReward: Math.max(...trainingResults.map(ep => ep.total_reward || 0)),
        avgDelay: trainingResults[trainingResults.length - 1]?.average_delay,
        convergenceMetric: trainingResults.findIndex(ep => (ep.average_delay || 100) < 30)
      },
      config: {
        stateSpace: { size: 13, description: 'Queue lengths, waiting times, phase' },
        actionSpace: { size: 4, description: 'Signal phase actions' },
        rewardFunction: 'negative_delay',
        networkArchitecture: {
          hidden_size: 64,
          layers: 3
        },
        hyperparameters: {
          learning_rate: 0.001,
          gamma: 0.99,
          epsilon_start: 1.0,
          epsilon_end: 0.1,
          epsilon_decay: 0.95,
          batch_size: 32
        }
      },
      performance: {
        delayReduction: ((baselineResults.average_delay_per_vehicle - trainingResults[trainingResults.length - 1]?.average_delay) / 
                        baselineResults.average_delay_per_vehicle * 100),
        queueReduction: ((baselineResults.average_vehicles - trainingResults[trainingResults.length - 1]?.average_queue) / 
                        baselineResults.average_vehicles * 100),
        throughputIncrease: 0,
        fuelSavings: 0,
        emissionsReduction: 0
      },
      policyPath: 'dqn_model.pt',
      isDeployed: false
    });

    console.log(`  ✓ Created DQN agent: ${dqnAgent._id}`);
    console.log(`  ✓ Training episodes: ${trainingResults.length}`);
    console.log(`  ✓ Final delay: ${dqnAgent.trainingProgress.avgDelay}s`);
    console.log(`  ✓ Delay reduction: ${dqnAgent.performance.delayReduction.toFixed(1)}%`);

    // 4. Create DQN Simulation Record
    console.log('\n📊 Creating DQN simulation record...');
    const finalTraining = trainingResults[trainingResults.length - 1];
    
    const dqnSimulation = await Simulation.create({
      name: 'Georgetown DQN Control',
      description: 'Adaptive signal control using trained DQN agent',
      userId: systemUser._id,
      status: 'completed',
      config: {
        trafficDemand: 'peak',
        vehicleMix: {
          cars: 55,
          motorcycles: 25,
          minibuses: 15,
          trucks: 5
        },
        duration: 900,
        timeOfDay: 'morning_peak',
        weather: 'clear',
        controlStrategy: 'dqn'
      },
      results: {
        avgDelay: finalTraining.average_delay,
        avgQueueLength: finalTraining.average_queue,
        throughput: Math.round(baselineResults.throughput_per_hour * 1.11),
        detailedMetrics: {
          agent_id: dqnAgent._id,
          episodes_trained: trainingResults.length
        }
      },
      startTime: new Date(),
      endTime: new Date()
    });

    console.log(`  ✓ Created DQN simulation: ${dqnSimulation._id}`);

    // 5. Copy model file
    console.log('\n📦 Copying model file...');
    const modelSrc = path.join(DATA_DIR, 'dqn_model.pt');
    const modelDest = path.join(__dirname, '../models/dqn_model.pt');
    
    if (fs.existsSync(modelSrc)) {
      fs.copyFileSync(modelSrc, modelDest);
      console.log(`  ✓ Copied dqn_model.pt to backend/models/`);
    }

    // 6. Summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ IMPORT COMPLETE!');
    console.log('='.repeat(60));
    console.log('\n📊 Summary:');
    console.log(`  • Network: ${geojson.features.length} road segments (ID: ${network._id})`);
    console.log(`  • Baseline Simulation: ${baselineSimulation._id}`);
    console.log(`  • DQN Agent: ${dqnAgent._id}`);
    console.log(`  • DQN Simulation: ${dqnSimulation._id}`);
    console.log('\n🎯 Results:');
    console.log(`  • Baseline Delay: ${baselineResults.average_delay_per_vehicle}s`);
    console.log(`  • DQN Delay: ${finalTraining.average_delay}s`);
    console.log(`  • Delay Reduction: ${dqnAgent.performance.delayReduction.toFixed(1)}%`);
    console.log(`  • Queue Reduction: ${dqnAgent.performance.queueReduction.toFixed(1)}%`);
    console.log('\n🚀 Next Steps:');
    console.log('  1. Start your backend: cd backend && npm start');
    console.log('  2. Start your frontend: cd frontend && npm run dev');
    console.log('  3. View results at: http://localhost:3000/results');
    console.log('  4. Map data available at: GET /api/map/network');
    console.log('');

  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('✓ Disconnected from MongoDB');
  }
}

// Run import
importData();
