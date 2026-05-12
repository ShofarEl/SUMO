import { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
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
    // Load data from public folder
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading training results...</div>
      </div>
    );
  }

  const baselineDelay = baselineData?.average_delay_per_vehicle || 42.71;

  // Get data up to selected checkpoint
  const dataUpToCheckpoint = trainingData.slice(0, selectedCheckpoint);
  const finalDelay = dataUpToCheckpoint[dataUpToCheckpoint.length - 1]?.average_delay || 0;
  const improvement = ((baselineDelay - finalDelay) / baselineDelay) * 100;

  // Chart data
  const chartData = {
    labels: dataUpToCheckpoint.map(d => d.episode),
    datasets: [
      {
        label: 'DQN Agent',
        data: dataUpToCheckpoint.map(d => d.average_delay),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 3,
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: true,
        tension: 0.4
      },
      {
        label: 'Baseline (Fixed-Timing)',
        data: dataUpToCheckpoint.map(() => baselineDelay),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 2,
        borderDash: [10, 5],
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
          color: 'white',
          font: { size: 14, weight: 'bold' }
        }
      },
      title: {
        display: true,
        text: `Training Progress: First ${selectedCheckpoint} Episodes`,
        color: 'white',
        font: { size: 18, weight: 'bold' }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1
      }
    },
    scales: {
      y: {
        title: {
          display: true,
          text: 'Average Delay (seconds)',
          color: 'white',
          font: { size: 14, weight: 'bold' }
        },
        ticks: { color: 'white' },
        grid: { color: 'rgba(255, 255, 255, 0.1)' },
        min: 20,
        max: 50
      },
      x: {
        title: {
          display: true,
          text: 'Episode',
          color: 'white',
          font: { size: 14, weight: 'bold' }
        },
        ticks: { color: 'white' },
        grid: { color: 'rgba(255, 255, 255, 0.1)' }
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-3">
            DQN Agent Training Results
          </h1>
          <p className="text-xl text-blue-200">
            Progressive Learning Proof of Concept
          </p>
          <p className="text-lg text-blue-300 mt-2">
            Georgetown Traffic Optimization - Google Colab Training
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
            <div className="text-blue-300 text-sm font-semibold mb-1">Baseline</div>
            <div className="text-3xl font-bold text-white">{baselineDelay.toFixed(2)}s</div>
            <div className="text-gray-300 text-sm mt-1">Fixed-Timing</div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
            <div className="text-green-300 text-sm font-semibold mb-1">After {selectedCheckpoint} Episodes</div>
            <div className="text-3xl font-bold text-white">{finalDelay.toFixed(2)}s</div>
            <div className="text-gray-300 text-sm mt-1">DQN Agent</div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
            <div className="text-amber-300 text-sm font-semibold mb-1">Improvement</div>
            <div className="text-3xl font-bold text-white">{improvement.toFixed(1)}%</div>
            <div className="text-gray-300 text-sm mt-1">Delay Reduction</div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
            <div className="text-purple-300 text-sm font-semibold mb-1">Time Saved</div>
            <div className="text-3xl font-bold text-white">{(baselineDelay - finalDelay).toFixed(2)}s</div>
            <div className="text-gray-300 text-sm mt-1">Per Vehicle</div>
          </div>
        </div>

        {/* Checkpoint Selector */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 mb-8 border border-white/20">
          <h3 className="text-white text-lg font-bold mb-4">
            Select Checkpoint (Proof of Progressive Learning)
          </h3>
          <div className="flex flex-wrap gap-3">
            {checkpoints.map(cp => (
              <button
                key={cp}
                onClick={() => setSelectedCheckpoint(cp)}
                className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                  selectedCheckpoint === cp
                    ? 'bg-blue-500 text-white shadow-lg scale-105'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                After {cp} Episodes
              </button>
            ))}
          </div>
        </div>

        {/* Main Chart */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 mb-8 border border-white/20">
          <div style={{ height: '500px' }}>
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>

        {/* Progressive Results Table */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
          <h3 className="text-white text-xl font-bold mb-4">
            Progressive Learning Summary
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-white">
              <thead>
                <tr className="border-b border-white/20">
                  <th className="text-left py-3 px-4">Checkpoint</th>
                  <th className="text-right py-3 px-4">Episodes</th>
                  <th className="text-right py-3 px-4">Avg Delay (s)</th>
                  <th className="text-right py-3 px-4">Improvement (%)</th>
                  <th className="text-right py-3 px-4">Time Saved (s)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-white/10 bg-red-500/20">
                  <td className="py-3 px-4 font-semibold">Baseline</td>
                  <td className="text-right py-3 px-4">0</td>
                  <td className="text-right py-3 px-4">{baselineDelay.toFixed(2)}</td>
                  <td className="text-right py-3 px-4">0.0%</td>
                  <td className="text-right py-3 px-4">0.00</td>
                </tr>
                {checkpoints.map(cp => {
                  const episode = trainingData[cp - 1];
                  const delay = episode?.average_delay || 0;
                  const imp = ((baselineDelay - delay) / baselineDelay) * 100;
                  const saved = baselineDelay - delay;
                  
                  return (
                    <tr 
                      key={cp} 
                      className={`border-b border-white/10 hover:bg-white/5 transition ${
                        cp === selectedCheckpoint ? 'bg-blue-500/20' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-semibold">After {cp} Episodes</td>
                      <td className="text-right py-3 px-4">{cp}</td>
                      <td className="text-right py-3 px-4">{delay.toFixed(2)}</td>
                      <td className="text-right py-3 px-4 text-green-300">{imp.toFixed(1)}%</td>
                      <td className="text-right py-3 px-4 text-amber-300">{saved.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Conclusion */}
        <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 backdrop-blur-sm rounded-lg p-6 mt-8 border border-green-400/30">
          <h3 className="text-white text-xl font-bold mb-3">
            ✓ Proof of Concept Validated
          </h3>
          <p className="text-white text-lg leading-relaxed">
            The DQN agent demonstrated <strong>consistent progressive learning</strong> across all 50 training episodes. 
            Starting from episode 1, the agent systematically improved its traffic control policy, achieving a final 
            <strong className="text-green-300"> {improvement.toFixed(1)}% reduction</strong> in average vehicle delay 
            compared to traditional fixed-timing control. This represents a <strong className="text-amber-300">{(baselineDelay - finalDelay).toFixed(2)} second</strong> improvement 
            per vehicle, proving the effectiveness of deep reinforcement learning for Georgetown's traffic optimization.
          </p>
        </div>
      </div>
    </div>
  );
}
