import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Switch from './Switch';
import './SettingsPage.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

function SettingsPage({ onSignOut }) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/settings`);
      setSettings(response.data);
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

  const handlePreferenceChange = (key, value) => {
    const updates = {
      preferences: {
        [key]: value
      }
    };
    updateSettings(updates);
  };

  const handleDeviceConnect = () => {
    // For MVP, just simulate connection
    updateSettings({
      device: {
        connected: true,
        deviceName: 'Luna Device'
      }
    });
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
        <div className="header-icons-group">
          <img 
            src="/images/settings-icon.png" 
            alt="User" 
            className="header-icon settings-icon-img"
            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
          />
          <span className="settings-icon-fallback" style={{ display: 'none' }}>⚙️</span>
          
          <div className="mascot-circle-small">
            <img 
              src="/images/mascot.png" 
              alt="Luna Mascot" 
              className="mascot-image-small"
              onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'block'; }}
            />
            <span className="mascot-emoji-fallback-small" style={{ display: 'none' }}>🦘</span>
          </div>
        </div>
        <h1 className="settings-title">Settings</h1>
        <p className="settings-subtitle">Customize your experience</p>
      </div>

      {/* Profile Section */}
      <div className="settings-card profile-card">
        <h2 className="card-title">Profile</h2>

        <div className="profile-info">
          <div className="profile-avatar">
            <img 
              src="/images/moon.png" 
              alt="Moon" 
              className="avatar-icon"
              onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
            />
            <span className="avatar-icon-fallback" style={{ display: 'none' }}>🌙</span>
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
            src="/images/notification-icon.png" 
            alt="Bell" 
            className="section-icon"
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
              <div className="setting-label">Ovulation Window</div>
              <div className="setting-description">Track your fertile window</div>
            </div>
            <Switch
              checked={settings.notifications.ovulationWindow}
              onChange={(e) => handleNotificationChange('ovulationWindow', e.target.checked)}
            />
          </div>
        </div>
      </div>

      {/* Units & Preferences */}
      <div className="settings-card preferences-card">
        <div className="card-header-with-icon">
          <img 
            src="/images/globe-icon.png" 
            alt="Globe" 
            className="section-icon"
            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
          />
          <span className="section-icon-fallback" style={{ display: 'none' }}>🌐</span>
          <h2 className="card-title">Units & Preferences</h2>
        </div>

        <div className="preferences-list">
          <div className="preference-item">
            <label className="preference-label">Temperature Unit</label>
            <select 
              className="preference-select"
              value={settings.preferences.temperatureUnit}
              onChange={(e) => handlePreferenceChange('temperatureUnit', e.target.value)}
            >
              <option>Celsius (°C)</option>
              <option>Fahrenheit (°F)</option>
            </select>
          </div>

          <div className="preference-item">
            <label className="preference-label">Cycle Length</label>
            <select 
              className="preference-select"
              value={settings.preferences.cycleLength}
              onChange={(e) => handlePreferenceChange('cycleLength', parseInt(e.target.value))}
            >
              <option value={21}>21 days</option>
              <option value={24}>24 days</option>
              <option value={28}>28 days (Average)</option>
              <option value={30}>30 days</option>
              <option value={35}>35 days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bluetooth Connection */}
      <div className="settings-card">
        <div className="card-header-with-icon">
          <img 
            src="/images/bluetooth-icon.png" 
            alt="Bluetooth" 
            className="section-icon"
            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
          />
          <span className="section-icon-fallback" style={{ display: 'none' }}>📶</span>
          <h2 className="card-title">Device Connection</h2>
        </div>

        <p className="device-description">
          Connect a Bluetooth thermometer for automatic temperature tracking.
        </p>

        <button 
          onClick={handleDeviceConnect}
          className="settings-button primary"
        >
          Connect Device
        </button>

        <div className="device-status">
          {settings.device.connected 
            ? `Connected: ${settings.device.deviceName}`
            : 'No devices connected'
          }
        </div>
      </div>

      {/* Privacy & Security */}
      <div className="settings-card privacy-card">
        <div className="card-header-with-icon">
          <img 
            src="/images/lock-icon.png" 
            alt="Lock" 
            className="section-icon"
            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
          />
          <span className="section-icon-fallback" style={{ display: 'none' }}>🔒</span>
          <h2 className="card-title">Privacy & Security</h2>
        </div>

        <div className="privacy-buttons">
          <button className="settings-button secondary text-left">
            Privacy Policy
          </button>
          <button className="settings-button secondary text-left">
            Terms of Service
          </button>
          <button className="settings-button secondary text-left">
            Data & Backup
          </button>
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
