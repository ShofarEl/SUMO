/**
 * Map and Network Routes
 * 
 * Routes for accessing Georgetown road network and map data
 */

import express from 'express';
import axios from 'axios';
import mongoose from 'mongoose';
import { protect } from '../middleware/auth.js';

const router = express.Router();

const PYTHON_API_URL = process.env.PYTHON_AI_SERVICE_URL || 'http://localhost:8000';

// Network model for GeoJSON storage
const NetworkSchema = new mongoose.Schema({
  name: String,
  location: String,
  geojson: Object,
  bbox: Object,
  createdAt: { type: Date, default: Date.now }
});
const Network = mongoose.models.Network || mongoose.model('Network', NetworkSchema);

/**
 * @route   GET /api/map/geojson
 * @desc    Get Georgetown network GeoJSON from MongoDB (public for demo)
 * @access  Public
 */
router.get('/geojson', async (req, res) => {
  try {
    const network = await Network.findOne().sort({ createdAt: -1 });
    
    if (!network) {
      return res.status(404).json({
        success: false,
        message: 'Network data not found. Please run: node backend/scripts/import_georgetown_data.js'
      });
    }

    res.json({
      success: true,
      data: {
        name: network.name,
        location: network.location,
        bbox: network.bbox,
        geojson: network.geojson
      }
    });
  } catch (error) {
    console.error('Error fetching GeoJSON:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching network data',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/map/network/latest
 * @desc    Get latest Georgetown road network data
 * @access  Private
 */
router.get('/network/latest', protect, async (req, res) => {
  try {
    const response = await axios.get(`${PYTHON_API_URL}/api/sumo/networks/latest`);
    res.json({
      success: true,
      data: response.data
    });
  } catch (error) {
    console.error('Error fetching network:', error.message);
    
    if (error.response?.status === 404) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NETWORK_NOT_FOUND',
          message: 'No network data found. Please import Georgetown network first.'
        }
      });
    }
    
    res.status(500).json({
      success: false,
      error: {
        code: 'NETWORK_FETCH_ERROR',
        message: 'Failed to fetch network data'
      }
    });
  }
});

/**
 * @route   GET /api/map/network
 * @desc    Get Georgetown road network data
 * @access  Private
 */
router.get('/network', protect, async (req, res) => {
  try {
    const response = await axios.get(`${PYTHON_API_URL}/api/sumo/networks/latest`);
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching network:', error.message);
    
    if (error.response?.status === 404) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NETWORK_NOT_FOUND',
          message: 'No network data found. Please import Georgetown network first.'
        }
      });
    }
    
    res.status(500).json({
      success: false,
      error: {
        code: 'NETWORK_FETCH_ERROR',
        message: 'Failed to fetch network data'
      }
    });
  }
});

/**
 * @route   GET /api/map/intersections
 * @desc    Get intersections for the latest network
 * @access  Private
 */
router.get('/intersections', protect, async (req, res) => {
  try {
    const { key_only } = req.query;
    
    // First get the latest network
    const networkResponse = await axios.get(`${PYTHON_API_URL}/api/sumo/networks/latest`);
    const networkId = networkResponse.data.network_id;
    
    // Then get intersections
    const intersectionsResponse = await axios.get(
      `${PYTHON_API_URL}/api/sumo/networks/${networkId}/intersections`,
      {
        params: { key_only: key_only === 'true' }
      }
    );
    
    res.json({
      success: true,
      data: intersectionsResponse.data
    });
  } catch (error) {
    console.error('Error fetching intersections:', error.message);
    
    if (error.response?.status === 404) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NETWORK_NOT_FOUND',
          message: 'No network data found'
        }
      });
    }
    
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERSECTIONS_FETCH_ERROR',
        message: 'Failed to fetch intersections'
      }
    });
  }
});

/**
 * @route   GET /api/map/intersections/:id
 * @desc    Get specific intersection details
 * @access  Private
 */
router.get('/intersections/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    
    const response = await axios.get(
      `${PYTHON_API_URL}/api/sumo/intersections/${id}/config`
    );
    
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching intersection:', error.message);
    
    if (error.response?.status === 404) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'INTERSECTION_NOT_FOUND',
          message: 'Intersection not found'
        }
      });
    }
    
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERSECTION_FETCH_ERROR',
        message: 'Failed to fetch intersection details'
      }
    });
  }
});

/**
 * @route   POST /api/map/import-network
 * @desc    Import Georgetown network from OpenStreetMap
 * @access  Private (Admin only)
 */
router.post('/import-network', protect, async (req, res) => {
  try {
    // Allow all authenticated users in development
    // if (req.user.role !== 'admin') {
    //   return res.status(403).json({
    //     success: false,
    //     error: {
    //       code: 'INSUFFICIENT_PERMISSIONS',
    //       message: 'Only administrators can import network data'
    //     }
    //   });
    // }
    
    const {
      network_type = 'drive',
      simplify = true,
      export_graphml = true,
      export_sumo = true,
      export_json = true
    } = req.body;
    
    const response = await axios.post(`${PYTHON_API_URL}/api/sumo/osm/import`, {
      network_type,
      simplify,
      export_graphml,
      export_sumo,
      export_json
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('Error importing network:', error.message);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'IMPORT_ERROR',
        message: 'Failed to import network data',
        details: error.response?.data || error.message
      }
    });
  }
});

/**
 * @route   POST /api/map/configure-intersections
 * @desc    Configure signal timing for key intersections
 * @access  Private (Admin/Researcher)
 */
router.post('/configure-intersections', protect, async (req, res) => {
  try {
    // Check if user has permission
    if (!['admin', 'researcher'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Only administrators and researchers can configure signals'
        }
      });
    }
    
    const response = await axios.post(
      `${PYTHON_API_URL}/api/sumo/intersections/configure-key`
    );
    
    res.json(response.data);
  } catch (error) {
    console.error('Error configuring signals:', error.message);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'CONFIGURE_ERROR',
        message: 'Failed to configure signal timing',
        details: error.response?.data || error.message
      }
    });
  }
});

/**
 * @route   POST /api/map/import
 * @desc    Import Georgetown network from OpenStreetMap
 * @access  Private (Admin only)
 */
router.post('/import', protect, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Only administrators can import network data'
        }
      });
    }
    
    const {
      network_type = 'drive',
      simplify = true,
      export_graphml = true,
      export_sumo = true,
      export_json = true
    } = req.body;
    
    const response = await axios.post(`${PYTHON_API_URL}/api/sumo/osm/import`, {
      network_type,
      simplify,
      export_graphml,
      export_sumo,
      export_json
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('Error importing network:', error.message);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'IMPORT_ERROR',
        message: 'Failed to import network data',
        details: error.response?.data || error.message
      }
    });
  }
});

/**
 * @route   POST /api/map/configure-signals
 * @desc    Configure signal timing for key intersections
 * @access  Private (Admin/Researcher)
 */
router.post('/configure-signals', protect, async (req, res) => {
  try {
    // Check if user has permission
    if (!['admin', 'researcher'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Only administrators and researchers can configure signals'
        }
      });
    }
    
    const response = await axios.post(
      `${PYTHON_API_URL}/api/sumo/intersections/configure-key`
    );
    
    res.json(response.data);
  } catch (error) {
    console.error('Error configuring signals:', error.message);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'CONFIGURE_ERROR',
        message: 'Failed to configure signal timing',
        details: error.response?.data || error.message
      }
    });
  }
});

/**
 * @route   GET /api/map/bbox
 * @desc    Get Georgetown bounding box coordinates
 * @access  Private
 */
router.get('/bbox', protect, async (req, res) => {
  try {
    const response = await axios.get(`${PYTHON_API_URL}/api/sumo/bbox`);
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching bbox:', error.message);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'BBOX_FETCH_ERROR',
        message: 'Failed to fetch bounding box'
      }
    });
  }
});

/**
 * @route   GET /api/map/traffic-density
 * @desc    Get traffic density data for heatmap
 * @access  Private
 */
router.get('/traffic-density', protect, async (req, res) => {
  try {
    const response = await axios.get(`${PYTHON_API_URL}/api/sumo/traffic-density`);
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching traffic density:', error.message);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'DENSITY_FETCH_ERROR',
        message: 'Failed to fetch traffic density data'
      }
    });
  }
});

/**
 * @route   GET /api/map/intersections/:id/history
 * @desc    Get historical data for a specific intersection
 * @access  Private
 */
router.get('/intersections/:id/history', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { timeRange = '1h', simulationId } = req.query;
    
    const params = { timeRange };
    if (simulationId) {
      params.simulationId = simulationId;
    }
    
    const response = await axios.get(
      `${PYTHON_API_URL}/api/sumo/intersections/${id}/history`,
      { params }
    );
    
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching intersection history:', error.message);
    
    if (error.response?.status === 404) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'HISTORY_NOT_FOUND',
          message: 'No historical data found for this intersection'
        }
      });
    }
    
    res.status(500).json({
      success: false,
      error: {
        code: 'HISTORY_FETCH_ERROR',
        message: 'Failed to fetch intersection history'
      }
    });
  }
});

/**
 * @route   GET /api/map/intersections/:id/metrics
 * @desc    Get performance metrics for a specific intersection
 * @access  Private
 */
router.get('/intersections/:id/metrics', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { timeRange = '1h', simulationId } = req.query;
    
    const params = { timeRange };
    if (simulationId) {
      params.simulationId = simulationId;
    }
    
    const response = await axios.get(
      `${PYTHON_API_URL}/api/sumo/intersections/${id}/metrics`,
      { params }
    );
    
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching intersection metrics:', error.message);
    
    if (error.response?.status === 404) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'METRICS_NOT_FOUND',
          message: 'No metrics found for this intersection'
        }
      });
    }
    
    res.status(500).json({
      success: false,
      error: {
        code: 'METRICS_FETCH_ERROR',
        message: 'Failed to fetch intersection metrics'
      }
    });
  }
});

export default router;
