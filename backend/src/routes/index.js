import express from 'express';
import temperatureRoutes from './temperature.js';
import dataRoutes from './data.js';
import settingsRoutes from './settings.js';
import bunnyRoutes from './bunny.js';

// ../api/..
const router = express.Router();

// Root route - API info
router.get('/', (req, res) => {
  res.send('Luna Backend API is running. Visit /api/temperature, /api/data, /api/settings for endpoints.');
});

router.use('/temperature', temperatureRoutes);
router.use('/data', dataRoutes);
router.use('/settings', settingsRoutes);
router.use('/bunny', bunnyRoutes);

export default router;