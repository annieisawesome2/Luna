import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Switch from '../components/Switch';
import './SettingsPage.css';
import { getCurrentDateKeyUTC, setSimulationState } from '../utils/currentDate';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

function SettingsPage({ onSignOut }) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [simEnabled, setSimEnabled] = useState(false);
  const [simDate, setSimDate] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/settings`);
      const s = response.data;
      setSettings(s);
      const enabled = !!s?.preferences?.simulation?.enabled;
      const date = s?.preferences?.simulation?.date || '';
      setSimEnabled(enabled);
      setSimDate(date);
      // Sync localStorage so the frontend date helpers match backend settings
      setSimulationState({ enabled, date: date || null });
    } catch (err) {
      console.error('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (updates) => {
    try {
      const response = await axios.put(`${API_BASE_URL}/settings`, updates);
      setSettings(response.data.settings);
    } catch (err) {
      console.error('Error updating settings:', err);
    }
  };

  const handleNotificationChange = (key, value) => {
    const updates = {
      notifications: {
        [key]: value
      }
    };
    updateSettings(updates);
  };

  const handleSimEnabledChange = async (enabled) => {
    setSimEnabled(enabled);
    // Default to today's date if enabling and no date is selected yet
    const nextDate = enabled && !simDate
      ? getCurrentDateKeyUTC()
      : simDate;
    setSimDate(nextDate);

    setSimulationState({ enabled, date: nextDate || null });
    await updateSettings({
      preferences: {
        simulation: { enabled, date: nextDate || null }
      }
    });
    window.dispatchEvent(new Event('luna:sim-date-changed'));
  };

  const handleSimDateChange = async (date) => {
    setSimDate(date);
    setSimulationState({ enabled: simEnabled, date: date || null });
    await updateSettings({
      preferences: {
        simulation: { enabled: simEnabled, date: date || null }
      }
    });
    window.dispatchEvent(new Event('luna:sim-date-changed'));
  };


  if (loading || !settings) {
    return (
      <div className="settings-page">
        <div className="loading">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="settings-page">
      {/* Header */}
      <div className="settings-header">
        <img
          src="/images/settings.png"
          alt="Settings"
          className="settings-logo"
        />
      </div>

      {/* Profile Section */}
      <div className="settings-card profile-card">
        <h2 className="card-title">Profile</h2>

        <div className="profile-info">
          <div className="profile-avatar">
            <img 
              src="/images/user_bunny.png" 
              alt="User" 
              className="avatar-icon user-bunny-icon"
              onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
            />
            <span className="avatar-icon-fallback" style={{ display: 'none' }}>👤</span>
          </div>
          <div className="profile-details">
            <div className="profile-name">{settings.profile.name}</div>
            <div className="profile-email">{settings.profile.email}</div>
          </div>
        </div>

        <button className="settings-button secondary">
          Edit Profile
        </button>
      </div>

      {/* Notifications */}
      <div className="settings-card">
        <div className="card-header-with-icon">
          <img 
            src="/images/bell.png" 
            alt="Bell" 
            className="section-icon notifications-icon"
            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
          />
          <span className="section-icon-fallback" style={{ display: 'none' }}>🔔</span>
          <h2 className="card-title">Notifications</h2>
        </div>

        <div className="settings-list">
          <div className="setting-item">
            <div className="setting-info">
              <div className="setting-label">Period Reminders</div>
              <div className="setting-description">Get notified before your period starts</div>
            </div>
            <Switch
              checked={settings.notifications.periodReminders}
              onChange={(e) => handleNotificationChange('periodReminders', e.target.checked)}
            />
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <div className="setting-label">Daily Logs</div>
              <div className="setting-description">Reminder to log your data</div>
            </div>
            <Switch
              checked={settings.notifications.dailyLogs}
              onChange={(e) => handleNotificationChange('dailyLogs', e.target.checked)}
            />
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <div className="setting-label">Ovulation Detection</div>
              <div className="setting-description">Get notified when ovulation is detected</div>
            </div>
            <Switch
              checked={settings.notifications.ovulationWindow}
              onChange={(e) => handleNotificationChange('ovulationWindow', e.target.checked)}
            />
          </div>
        </div>
      </div>

      {/* Demo Mode */}
      <div className="settings-card">
        <div className="card-header-with-icon">
          <h2 className="card-title">Demo Mode</h2>
        </div>

        <div className="settings-list">
          <div className="setting-item">
            <div className="setting-info">
              <div className="setting-label">Simulate “today”</div>
              <div className="setting-description">Pick a date to demo “next morning” behavior</div>
            </div>
            <Switch
              checked={simEnabled}
              onChange={(e) => handleSimEnabledChange(e.target.checked)}
            />
          </div>

          {simEnabled && (
            <div className="setting-item">
              <div className="setting-info">
                <div className="setting-label">Simulated date</div>
                <div className="setting-description">This date is used for “today”, chart window, and predictions</div>
              </div>
              <input
                type="date"
                value={simDate}
                onChange={(e) => handleSimDateChange(e.target.value)}
                className="settings-date-input"
              />
            </div>
          )}
        </div>
      </div>

      {/* Account Actions */}
      <div className="settings-card">
        <button 
          onClick={onSignOut}
          className="settings-button secondary sign-out"
        >
          <span className="sign-out-icon">🚪</span>
          Sign Out
        </button>
      </div>

      {/* App Version */}
      <div className="app-version">
        Luna v1.0.0
      </div>
    </div>
  );
}

export default SettingsPage;
