import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import LoginPage from './pages/LoginPage';
import BottomNav from './components/BottomNav';
import HomePage from './pages/HomePage';
import TipsPage from './pages/TipsPage';
import SettingsPage from './pages/SettingsPage';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [todayData, setTodayData] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isLoggedIn) {
      fetchData();
      // Refresh every 30 seconds
      const interval = setInterval(fetchData, 30000);
      return () => clearInterval(interval);
    }
  }, [isLoggedIn]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [todayRes, dataRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/today`),
        axios.get(`${API_BASE_URL}/data?days=14`)
      ]);
      
      setTodayData(todayRes.data);
      setHistoricalData(dataRes.data.readings || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to connect to server. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  const handleSignOut = () => {
    setIsLoggedIn(false);
    setTodayData(null);
    setHistoricalData([]);
    setActiveTab('home');
  };

  if (!isLoggedIn) {
    return <LoginPage onLogin={handleLogin} />;
  }

  if (loading && !todayData) {
    return (
      <div className="app">
        <div className="loading">Loading Luna...</div>
      </div>
    );
  }

  return (
    <div className="app">
      {error && (
        <div className="error-banner">
          {error}
        </div>
      )}

      {activeTab === 'home' && <HomePage />}
      {activeTab === 'tips' && <TipsPage />}
      {activeTab === 'settings' && <SettingsPage onSignOut={handleSignOut} />}

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}

export default App;
