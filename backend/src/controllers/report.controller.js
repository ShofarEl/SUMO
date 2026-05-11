import Report from '../models/Report.js';
import Simulation from '../models/Simulation.js';
import logger from '../utils/logger.js';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Generate a new report
export const generateReport = async (req, res) => {
  try {
    const { title, type, simulationIds, content } = req.body;

    // Validate required fields
    if (!title || !type) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Title and type are required'
        }
      });
    }

    // Fetch simulation data if simulationIds provided
    let simulations = [];
    if (simulationIds && simulationIds.length > 0) {
      simulations = await Simulation.find({ _id: { $in: simulationIds } });
    }

    // Generate report content
    const reportContent = content || generateReportContent(type, simulations);

    // Create report document
    const report = new Report({
      title,
      type,
      generatedBy: req.user._id,
      simulationIds: simulationIds || [],
      content: reportContent,
      format: 'pdf'
    });

    await report.save();

    // Generate PDF file
    const pdfPath = await generatePDF(report, simulations);
    report.fileUrl = pdfPath;
    await report.save();

    logger.info(`Report generated: ${report._id} by user ${req.user._id}`);

    res.status(201).json({
      success: true,
      data: report
    });
  } catch (error) {
    logger.error('Error generating report:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'REPORT_GENERATION_FAILED',
        message: 'Failed to generate report',
        details: error.message
      }
    });
  }
};

// Get all reports
export const getReports = async (req, res) => {
  try {
    const { type, page = 1, limit = 20 } = req.query;

    const query = {};
    if (type) query.type = type;

    // Only admins and researchers can see all reports
    if (req.user.role === 'viewer') {
      query.generatedBy = req.user._id;
    }

    const reports = await Report.find(query)
      .populate('generatedBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Report.countDocuments(query);

    res.json({
      success: true,
      data: reports,
      pagination: {
        total: count,
        page: parseInt(page),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching reports:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_FAILED',
        message: 'Failed to fetch reports'
      }
    });
  }
};

// Get report by ID
export const getReportById = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate('generatedBy', 'firstName lastName email')
      .populate('simulationIds');

    if (!report) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Report not found'
        }
      });
    }

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    logger.error('Error fetching report:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_FAILED',
        message: 'Failed to fetch report'
      }
    });
  }
};

// Download report file
export const downloadReport = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Report not found'
        }
      });
    }

    if (!report.fileUrl || !fs.existsSync(report.fileUrl)) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'FILE_NOT_FOUND',
          message: 'Report file not found'
        }
      });
    }

    const filename = `${report.title.replace(/[^a-z0-9]/gi, '_')}_${report._id}.pdf`;
    res.download(report.fileUrl, filename);
  } catch (error) {
    logger.error('Error downloading report:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DOWNLOAD_FAILED',
        message: 'Failed to download report'
      }
    });
  }
};

// Delete report
export const deleteReport = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Report not found'
        }
      });
    }

    // Only admin or report creator can delete
    if (req.user.role !== 'admin' && report.generatedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Not authorized to delete this report'
        }
      });
    }

    // Delete file if exists
    if (report.fileUrl && fs.existsSync(report.fileUrl)) {
      fs.unlinkSync(report.fileUrl);
    }

    await Report.findByIdAndDelete(req.params.id);

    logger.info(`Report deleted: ${req.params.id} by user ${req.user._id}`);

    res.json({
      success: true,
      message: 'Report deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting report:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DELETE_FAILED',
        message: 'Failed to delete report'
      }
    });
  }
};

// Helper function to generate report content based on type
function generateReportContent(type, simulations) {
  const content = {
    executiveSummary: '',
    methodology: '',
    results: {},
    conclusions: '',
    recommendations: []
  };

  if (type === 'simulation' && simulations.length > 0) {
    const sim = simulations[0];
    content.executiveSummary = `This report presents the results of a traffic simulation conducted in Georgetown, Guyana using ${sim.config.controlStrategy} control strategy.`;
    content.methodology = 'The simulation was conducted using SUMO (Simulation of Urban Mobility) with Georgetown road network data from OpenStreetMap.';
    content.results = {
      avgDelay: sim.results?.avgDelay || 0,
      avgQueueLength: sim.results?.avgQueueLength || 0,
      throughput: sim.results?.throughput || 0,
      co2Emissions: sim.results?.co2Emissions || 0
    };
    content.conclusions = 'The simulation demonstrates the effectiveness of AI-based traffic management approaches.';
    content.recommendations = [
      'Consider pilot deployment at key intersections',
      'Invest in sensor infrastructure',
      'Train staff on AI systems'
    ];
  } else if (type === 'comparison' && simulations.length > 1) {
    content.executiveSummary = `This report compares ${simulations.length} different traffic management scenarios in Georgetown.`;
    content.methodology = 'Multiple simulations were conducted with different control strategies to evaluate comparative performance.';
    content.results = {
      simulations: simulations.map(sim => ({
        name: sim.name,
        strategy: sim.config.controlStrategy,
        avgDelay: sim.results?.avgDelay || 0,
        throughput: sim.results?.throughput || 0
      }))
    };
    content.conclusions = 'Comparative analysis shows significant variation in performance across different control strategies.';
    content.recommendations = [
      'Implement best-performing strategy',
      'Conduct further validation',
      'Monitor real-world performance'
    ];
  } else if (type === 'feasibility') {
    content.executiveSummary = 'This report assesses the feasibility of implementing AI-driven traffic management in Georgetown, Guyana.';
    content.methodology = 'Assessment based on infrastructure readiness, computational capacity, institutional readiness, and governance frameworks.';
    content.results = {
      overallReadiness: 62,
      sensorInfrastructure: 55,
      computationalCapacity: 75,
      institutionalReadiness: 50,
      governance: 65
    };
    content.conclusions = 'Georgetown has moderate readiness for AI traffic management with targeted investments needed.';
    content.recommendations = [
      'Phase 1: Pilot deployment at 3-5 intersections',
      'Phase 2: Expand to 15 intersections',
      'Phase 3: Network-wide deployment',
      'Invest in staff training and capacity building'
    ];
  } else if (type === 'full_research') {
    content.executiveSummary = 'This comprehensive research report evaluates AI techniques for traffic management in Georgetown, Guyana.';
    content.methodology = 'The research combines microscopic traffic simulation, machine learning prediction, and reinforcement learning-based control.';
    content.results = {
      lstmRMSE: 0.0245,
      rfRMSE: 0.0328,
      dqnDelayReduction: 30.3,
      marlDelayReduction: 34.1,
      throughputIncrease: 25.3
    };
    content.conclusions = 'AI-based approaches demonstrate significant potential for improving traffic flow in Georgetown.';
    content.recommendations = [
      'Pursue phased implementation approach',
      'Secure funding for sensor infrastructure',
      'Develop data governance policies',
      'Build institutional capacity',
      'Engage stakeholders throughout process'
    ];
  }

  return content;
}

// Helper function to generate PDF
async function generatePDF(report, simulations) {
  return new Promise((resolve, reject) => {
    try {
      // Ensure reports directory exists
      const reportsDir = path.join(__dirname, '../../reports');
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }

      const filename = `report_${report._id}.pdf`;
      const filepath = path.join(reportsDir, filename);

      const doc = new PDFDocument({ margin: 50 });
      const stream = fs.createWriteStream(filepath);

      doc.pipe(stream);

      // Title page
      doc.fontSize(24).text(report.title, { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Report Type: ${report.type}`, { align: 'center' });
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });
      doc.moveDown(2);

      // Executive Summary
      doc.fontSize(16).text('Executive Summary', { underline: true });
      doc.moveDown();
      doc.fontSize(11).text(report.content.executiveSummary || 'No executive summary provided.');
      doc.moveDown(2);

      // Methodology
      doc.fontSize(16).text('Methodology', { underline: true });
      doc.moveDown();
      doc.fontSize(11).text(report.content.methodology || 'No methodology provided.');
      doc.moveDown(2);

      // Results
      doc.fontSize(16).text('Results', { underline: true });
      doc.moveDown();
      if (report.content.results) {
        Object.entries(report.content.results).forEach(([key, value]) => {
          if (typeof value === 'object' && !Array.isArray(value)) {
            doc.fontSize(11).text(`${key}:`, { continued: false });
            Object.entries(value).forEach(([k, v]) => {
              doc.text(`  ${k}: ${v}`);
            });
          } else if (Array.isArray(value)) {
            doc.fontSize(11).text(`${key}:`);
            value.forEach(item => {
              if (typeof item === 'object') {
                Object.entries(item).forEach(([k, v]) => {
                  doc.text(`  ${k}: ${v}`);
                });
                doc.moveDown(0.5);
              } else {
                doc.text(`  - ${item}`);
              }
            });
          } else {
            doc.fontSize(11).text(`${key}: ${value}`);
          }
        });
      }
      doc.moveDown(2);

      // Conclusions
      doc.fontSize(16).text('Conclusions', { underline: true });
      doc.moveDown();
      doc.fontSize(11).text(report.content.conclusions || 'No conclusions provided.');
      doc.moveDown(2);

      // Recommendations
      if (report.content.recommendations && report.content.recommendations.length > 0) {
        doc.fontSize(16).text('Recommendations', { underline: true });
        doc.moveDown();
        report.content.recommendations.forEach((rec, index) => {
          doc.fontSize(11).text(`${index + 1}. ${rec}`);
        });
      }

      doc.end();

      stream.on('finish', () => {
        resolve(filepath);
      });

      stream.on('error', (error) => {
        reject(error);
      });
    } catch (error) {
      reject(error);
    }
  });
}
