# 🌙 Luna - Menstrual Cycle Companion

A hackathon MVP for tracking Basal Body Temperature (BBT) to monitor menstrual cycle phases. Luna combines hardware (ESP32), backend API, and a beautiful mobile-responsive dashboard.

## Features

- **Hardware**: ESP32-based device with DS18B20 temperature sensor, capacitive touch button, and NeoPixel LED ring
- **Backend**: Node.js + Express API with cycle phase calculation logic
- **Frontend**: React dashboard with BBT graphs, phase indicators, and daily insights
- **Mobile-Responsive**: Works beautifully on phones, tablets, and desktops

## Project Structure

```
Luna/
├── esp32/              # Arduino code for ESP32
│   └── luna_esp32.ino
├── backend/            # Node.js + Express API
│   ├── server.js
│   └── package.json
├── frontend/           # React dashboard
│   ├── src/
│   │   ├── App.js
│   │   └── components/
│   │       ├── BBTChart.js
│   │       ├── TodayCard.js
│   │       └── WidgetSimulation.js
│   └── package.json
├── WIRING.md           # Hardware wiring instructions
├── SETUP.md            # Complete setup guide
└── README.md           # This file
```

## Quick Start

### 1. Backend Setup

```bash
cd backend
npm install
npm start
```

Server runs on `http://localhost:3000`

### 2. Frontend Setup

```bash
cd frontend
npm install
npm start
```

App opens at `http://localhost:3000`

### 3. ESP32 Setup

1. Install Arduino IDE and ESP32 board support
2. Install required libraries (OneWire, DallasTemperature, Adafruit_NeoPixel)
3. Update WiFi credentials and server URL in `esp32/luna_esp32.ino`
4. Upload to ESP32
5. Wire components (see WIRING.md)

## API Endpoints

- `POST /temperature` - Receive BBT reading from ESP32
- `GET /data?days=14` - Get historical BBT data
- `GET /today` - Get today's summary (temperature, phase, tip)
- `GET /phase` - Get current cycle phase information
- `GET /tips` - Get phase-specific wellness tips
- `GET /health` - Health check

## AI-Powered Tips (Optional)

Luna can use Google Gemini AI to generate personalized, contextual tips based on your cycle phase and BBT readings. This feature is optional - the app works perfectly with static tips if you don't configure Gemini.

### Setup Gemini (Optional)

1. Get a free API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Set it as an environment variable:
   ```bash
   export GEMINI_API_KEY="your-api-key-here"
   ```
   Or create a `.env` file in the `backend` directory:
   ```
   GEMINI_API_KEY=your-api-key-here
   ```
3. Restart the backend server

Without the API key, Luna will use curated static tips that are still helpful and informative.

## Cycle Phase Logic

The backend calculates cycle phases based on:
- **Menstrual** (Days 1-5): Lower BBT
- **Follicular** (Days 6-13): Rising BBT
- **Ovulation** (Days 14-16): Peak BBT (0.3-0.5°C rise)
- **Luteal** (Days 17-28): Sustained high BBT

The system detects ovulation by analyzing BBT rise patterns over recent readings.

## Hardware Components

- ESP32 DevKit
- DS18B20 Temperature Sensor
- 4.7kΩ Resistor (for DS18B20 pull-up)
- Capacitive Touch Button
- NeoPixel LED Ring (WS2812B, 12 LEDs)
- USB Cable or Battery Pack

See [WIRING.md](WIRING.md) for detailed wiring instructions.

## Documentation

- **[SETUP.md](SETUP.md)** - Complete setup guide for all components
- **[WIRING.md](WIRING.md)** - Hardware wiring diagram and instructions

## Demo Features

- Sample data pre-loaded for immediate demo
- Real-time updates when ESP32 sends readings
- Color-coded phase indicators
- Mobile-responsive design
- Widget simulation card

## Development

### Backend Development
```bash
cd backend
npm run dev  # Auto-reload with nodemon
```

### Frontend Development
```bash
cd frontend
npm start  # Auto-reload on file changes
```

### Testing ESP32
- Open Serial Monitor (115200 baud)
- Monitor WiFi connection and sensor readings
- Test touch button and LED feedback

## Troubleshooting

### Backend won't start
- Check if port 3000 is available
- Verify Node.js version (v16+)
- Run `npm install` in backend directory

### ESP32 won't connect
- Verify WiFi credentials in code
- Ensure 2.4GHz WiFi (ESP32 doesn't support 5GHz)
- Check server IP address matches your computer

### Frontend can't reach backend
- Verify backend is running
- Check `REACT_APP_API_URL` in `.env` file
- Ensure CORS is enabled in backend

See [SETUP.md](SETUP.md) for detailed troubleshooting.

## Hackathon MVP Notes

This is a minimal viable product for demonstration:
- In-memory data storage (replace with database for production)
- Simplified cycle phase calculation (28-day assumption)
- Manual button press for readings
- Sample data included for live demo

## Future Enhancements

- Database persistence (PostgreSQL/MongoDB)
- User authentication
- Multiple cycle tracking
- Advanced ovulation prediction algorithms
- Mobile app (React Native)
- OTA updates for ESP32
- Battery optimization with deep sleep
- Cloud deployment

## License

MIT

## Credits

Built for hackathon demonstration. Components:
- ESP32 Arduino Core
- React + Recharts
- Express.js
- NeoPixel (WS2812B)

---

**Happy Tracking! 🌙**
