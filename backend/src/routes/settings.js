import express from 'express';
import { temperatureReadings, userSettings } from '../data/store.js';

const router = express.Router();

// GET /settings - Get user settings
router.get('/', (req, res) => {
  try {
    res.json(userSettings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /settings - Update user settings
router.put('/', (req, res) => {
  try {
    const { profile, notifications, preferences, device } = req.body;
    
    if (profile) {
      userSettings.profile = { ...userSettings.profile, ...profile };
    }
    if (notifications) {
      userSettings.notifications = { ...userSettings.notifications, ...notifications };
    }
    if (preferences) {
      userSettings.preferences = { ...userSettings.preferences, ...preferences };
      // Ensure nested simulation object merges cleanly
      if (preferences.simulation) {
        userSettings.preferences.simulation = {
          ...userSettings.preferences.simulation,
          ...preferences.simulation
        };
      }
    }
    if (device) {
      userSettings.device = { ...userSettings.device, ...device };
    }
    
    res.json({
      success: true,
      settings: userSettings
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;