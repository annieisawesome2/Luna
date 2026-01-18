import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import './BBTChart.css';

function BBTChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="bbt-chart">
        <h3 className="chart-title">BBT Trend</h3>
        <div className="chart-empty">
          <p>No data available yet</p>
          <p className="hint">Start tracking to see your BBT pattern</p>
        </div>
      </div>
    );
  }

  // Format data for chart
  const chartData = data.map(reading => ({
    date: new Date(reading.timestamp).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    }),
    temperature: parseFloat(reading.temperature.toFixed(2)),
    fullDate: reading.timestamp
  }));

  // Calculate min/max for Y-axis
  const temps = chartData.map(d => d.temperature);
  const minTemp = Math.min(...temps) - 0.2;
  const maxTemp = Math.max(...temps) + 0.2;

  return (
    <div className="bbt-chart">
      <h3 className="chart-title">
        <img src="/images/chart-icon.png" alt="Chart" className="inline-icon" onError={(e) => e.target.style.display = 'none'} />
        <span className="emoji-fallback">📈</span> BBT Trend (Last 14 Days)
      </h3>
      <div className="chart-container">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#d4d8ed" />
            <XAxis 
              dataKey="date" 
              stroke="#4a2f3f"
              tick={{ fill: '#4a2f3f' }}
              style={{ fontSize: '0.85rem' }}
            />
            <YAxis 
              domain={[minTemp, maxTemp]}
              stroke="#4a2f3f"
              tick={{ fill: '#4a2f3f' }}
              label={{ value: 'Temperature (°C)', angle: -90, position: 'insideLeft' }}
              style={{ fontSize: '0.85rem' }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #9d7089',
                borderRadius: '1rem',
                padding: '0.5rem'
              }}
              formatter={(value) => [`${value}°C`, 'BBT']}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="temperature" 
              stroke="#9d7089" 
              strokeWidth={3}
              dot={{ fill: '#9d7089', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6 }}
              name="BBT (°C)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="chart-info">
        <p>
          <img src="/images/chart-icon.png" alt="Chart" className="inline-icon" onError={(e) => e.target.style.display = 'none'} />
          <span className="emoji-fallback">📈</span> Track your BBT daily to identify ovulation patterns
        </p>
      </div>
    </div>
  );
}

export default BBTChart;
