import { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import GlobalHeader from '../components/GlobalHeader';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function TrainingResultsPage() {
  const [trainingData, setTrainingData] = useState([]);
  const [baselineData, setBaselineData] = useState(null);
  const [selectedCheckpoint, setSelectedCheckpoint] = useState(50);
  const [loading, setLoading] = useState(true);

  const checkpoints = [5, 10, 15, 20, 30, 50];

  useEffect(() => {
    Promise.all([
      fetch('/data/training_results.json').then(res => res.json()),
      fetch('/data/baseline_results.json').then(res => res.json())
    ])
      .then(([training, baseline]) => {
        setTrainingData(training);
        setBaselineData(baseline);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading data:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-600">Loading training results...</div>
      </div>
    );
  }

  const baselineDelay = baselineData?.average_delay_per_vehicle || 42.71;
  const dataUpToCheckpoint = trainingData.slice(0, selectedCheckpoint);
  const finalDelay = dataUpToCheckpoint[dataUpToCheckpoint.length - 1]?.average_delay || 0;
  const improvement = ((baselineDelay - finalDelay) / baselineDelay) * 100;

  const chartData = {
    labels: dataUpToCheckpoint.map(d => d.episode),
    datasets: [
      {
        label: 'DQN Agent',
        data: dataUpToCheckpoint.map(d => d.average_delay),
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.05)',
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        fill: true,
        tension: 0.4
      },
      {
        label: 'Baseline',
        data: dataUpToCheckpoint.map(() => baselineDelay),
        borderColor: '#dc2626',
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderDash: [8, 4],
        pointRadius: 0,
        fill: false
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#374151',
          font: { size: 13, weight: '500' },
          padding: 15,
          usePointStyle: true
        }
      },
      title: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: '#2563eb',
        borderWidth: 1,
        padding: 12,
        displayColors: true
      }
    },
    scales: {
      y: {
        title: {
          display: true,
          text: 'Average Delay (seconds)',
          color: '#6b7280',
          font: { size: 12, weight: '500' }
        },
        ticks: { color: '#6b7280', font: { size: 11 } },
        grid: { color: '#f3f4f6', drawBorder: false },
        min: 20,
        max: 50
      },
      x: {
        title: {
          display: true,
          text: 'Episode',
          color: '#6b7280',
          font: { size: 12, weight: '500' }
        },
        ticks: { color: '#6b7280', font: { size: 11 } },
        grid: { color: '#f3f4f6', drawBorder: false }
      }
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <GlobalHeader />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8 sm:mb-12">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            DQN Training Results
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Progressive Learning Analysis • Georgetown Traffic Optimization
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="text-xs sm:text-sm text-gray-600 mb-1">Baseline</div>
            <div className="text-xl sm:text-2xl font-bold text-gray-900">{baselineDelay.toFixed(1)}s</div>
            <div className="text-xs text-gray-500 mt-1">Fixed-Timing</div>
          </div>
          
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="text-xs sm:text-sm text-gray-600 mb-1">Episode {selectedCheckpoint}</div>
            <div className="text-xl sm:text-2xl font-bold text-blue-600">{finalDelay.toFixed(1)}s</div>
            <div className="text-xs text-gray-500 mt-1">DQN Agent</div>
          </div>
          
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="text-xs sm:text-sm text-gray-600 mb-1">Improvement</div>
            <div className="text-xl sm:text-2xl font-bold text-green-600">{improvement.toFixed(1)}%</div>
            <div className="text-xs text-gray-500 mt-1">Reduction</div>
          </div>
          
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="text-xs sm:text-sm text-gray-600 mb-1">Time Saved</div>
            <div className="text-xl sm:text-2xl font-bold text-purple-600">{(baselineDelay - finalDelay).toFixed(1)}s</div>
            <div className="text-xs text-gray-500 mt-1">Per Vehicle</div>
          </div>
        </div>

        {/* Checkpoint Selector */}
        <div className="border border-gray-200 rounded-lg p-4 sm:p-6 mb-8">
          <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-4">
            Select Training Checkpoint
          </h3>
          <div className="grid grid-cols-3 sm:flex sm:flex-wrap gap-2 sm:gap-3">
            {checkpoints.map(cp => (
              <button
                key={cp}
                onClick={() => setSelectedCheckpoint(cp)}
                className={`px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                  selectedCheckpoint === cp
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Ep {cp}
              </button>
            ))}
          </div>
        </div>

        {/* Main Chart */}
        <div className="border border-gray-200 rounded-lg p-4 sm:p-6 mb-8">
          <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-4">
            Training Progress: First {selectedCheckpoint} Episodes
          </h3>
          <div style={{ height: '300px' }} className="sm:h-96">
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>

        {/* Progressive Results Table */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-200 bg-gray-50">
            <h3 className="text-sm sm:text-base font-semibold text-gray-900">
              Progressive Learning Summary
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Checkpoint</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">Episodes</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">Delay (s)</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">Improvement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr className="bg-red-50">
                  <td className="py-3 px-4 font-medium text-gray-900">Baseline</td>
                  <td className="text-right py-3 px-4 text-gray-600">0</td>
                  <td className="text-right py-3 px-4 text-gray-900">{baselineDelay.toFixed(2)}</td>
                  <td className="text-right py-3 px-4 text-gray-600">0.0%</td>
                </tr>
                {checkpoints.map(cp => {
                  const episode = trainingData[cp - 1];
                  const delay = episode?.average_delay || 0;
                  const imp = ((baselineDelay - delay) / baselineDelay) * 100;
                  
                  return (
                    <tr 
                      key={cp} 
                      className={`hover:bg-gray-50 ${
                        cp === selectedCheckpoint ? 'bg-blue-50' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-medium text-gray-900">After {cp} Episodes</td>
                      <td className="text-right py-3 px-4 text-gray-600">{cp}</td>
                      <td className="text-right py-3 px-4 text-gray-900">{delay.toFixed(2)}</td>
                      <td className="text-right py-3 px-4 text-green-600 font-medium">{imp.toFixed(1)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Conclusion */}
        <div className="mt-8 border border-green-200 bg-green-50 rounded-lg p-4 sm:p-6">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <div>
              <h4 className="text-sm sm:text-base font-semibold text-green-900 mb-2">
                Proof of Concept Validated
              </h4>
              <p className="text-xs sm:text-sm text-green-800 leading-relaxed">
                The DQN agent demonstrated consistent progressive learning across 50 training episodes, 
                achieving a <strong>{improvement.toFixed(1)}% reduction</strong> in average vehicle delay 
                compared to traditional fixed-timing control. This represents a <strong>{(baselineDelay - finalDelay).toFixed(2)} second</strong> improvement 
                per vehicle, proving the effectiveness of deep reinforcement learning for Georgetown's traffic optimization.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
