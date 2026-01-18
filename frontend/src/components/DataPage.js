import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import './DataPage.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

function DataPage() {
  const [temperatureData, setTemperatureData] = useState([]);
  const [moodData, setMoodData] = useState([]);
  const [avgTemp, setAvgTemp] = useState(null);
  const [avgMood, setAvgMood] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tempRes, moodRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/data/chart`),
        axios.get(`${API_BASE_URL}/data/mood`)
      ]);

      setTemperatureData(tempRes.data.temperatureData || []);
      setMoodData(moodRes.data.moodData || []);
      setAvgTemp(tempRes.data.avgTemp);
      setAvgMood(moodRes.data.avgMood);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/data/export`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'luna-data.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Error exporting data:', err);
      alert('Failed to export data. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="data-page">
        <div className="loading">Loading data...</div>
      </div>
    );
  }

  return (
    <div className="data-page">
      {/* Header */}
      <div className="data-header">
        <h1 className="data-title">Your Data</h1>
        <p className="data-subtitle">Insights from your cycle</p>
      </div>

      {/* Basal Body Temperature Chart */}
      <div className="data-card">
        <div className="card-header-row">
          <h2 className="card-title">Basal Body Temperature</h2>
          <img 
            src="/images/chart-icon.png" 
            alt="Trending" 
            className="trending-icon"
            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
          />
          <span className="trending-icon-fallback" style={{ display: 'none' }}>📈</span>
        </div>

        <div className="chart-container">
          <ResponsiveContainer width="100%" height={256}>
            <LineChart data={temperatureData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d4d8ed" />
              <XAxis
                dataKey="day"
                label={{ value: "Day of Cycle", position: "insideBottom", offset: -5 }}
                stroke="#4a2f3f"
                tick={{ fill: "#4a2f3f", fontSize: 12 }}
              />
              <YAxis
                domain={[36, 37]}
                label={{ value: "Temperature (°C)", angle: -90, position: "insideLeft" }}
                stroke="#4a2f3f"
                tick={{ fill: "#4a2f3f", fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(255, 255, 255, 0.95)",
                  border: "1px solid #9d7089",
                  borderRadius: "1rem",
                  padding: "0.5rem",
                }}
                formatter={(value) => [`${value}°C`, 'BBT']}
              />
              <Line
                type="monotone"
                dataKey="temp"
                stroke="#9d7089"
                strokeWidth={3}
                dot={{ fill: "#9d7089", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <p className="chart-note">
          Temperature typically rises after ovulation and remains elevated during the luteal phase.
        </p>
      </div>

      {/* Mood Tracker Chart */}
      <div className="data-card mood-card">
        <h2 className="card-title">Mood Tracker</h2>

        <div className="chart-container">
          <ResponsiveContainer width="100%" height={256}>
            <LineChart data={moodData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d4d8ed" />
              <XAxis
                dataKey="day"
                label={{ value: "Day of Cycle", position: "insideBottom", offset: -5 }}
                stroke="#4a2f3f"
                tick={{ fill: "#4a2f3f", fontSize: 12 }}
              />
              <YAxis
                domain={[1, 5]}
                ticks={[1, 2, 3, 4, 5]}
                label={{ value: "Mood (1-5)", angle: -90, position: "insideLeft" }}
                stroke="#4a2f3f"
                tick={{ fill: "#4a2f3f", fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(255, 255, 255, 0.95)",
                  border: "1px solid #93a7d1",
                  borderRadius: "1rem",
                  padding: "0.5rem",
                }}
                formatter={(value) => [value, 'Mood']}
              />
              <Line
                type="monotone"
                dataKey="mood"
                stroke="#93a7d1"
                strokeWidth={3}
                dot={{ fill: "#93a7d1", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="mood-scale">
          <span>1 = Low</span>
          <span>3 = Neutral</span>
          <span>5 = High</span>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="stats-grid">
        <div className="stat-card stat-card-1">
          <div className="stat-value">{avgTemp ? `${avgTemp}°C` : '--'}</div>
          <div className="stat-label">Avg Temp</div>
        </div>

        <div className="stat-card stat-card-2">
          <div className="stat-value">{avgMood || '--'}</div>
          <div className="stat-label">Avg Mood</div>
        </div>
      </div>

      {/* Export section */}
      <div className="data-card export-card">
        <h2 className="card-title">Data Management</h2>
        
        <div className="export-buttons">
          <button 
            onClick={handleExportCSV}
            className="export-button export-primary"
          >
            Export Data as CSV
          </button>
          <button className="export-button export-secondary">
            Share with Healthcare Provider
          </button>
        </div>
      </div>
    </div>
  );
}

export default DataPage;
