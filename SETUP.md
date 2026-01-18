# Luna Setup Guide

## Quick Start

This guide will help you set up the complete Luna system: ESP32 hardware, backend server, and frontend dashboard.

## Prerequisites

- Node.js (v16 or higher) and npm
- Arduino IDE with ESP32 board support
- WiFi network (for ESP32 connection)
- Hardware components (see WIRING.md)

---

## Part 1: Backend Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Google Gemini (Optional)

Luna can use Google Gemini AI to generate personalized tips. This is optional - the app will work with static tips if Gemini is not configured.

1. Get a Gemini API key:
   - Go to https://makersuite.google.com/app/apikey
   - Sign in with your Google account
   - Create a new API key

2. Set the API key as an environment variable:

   **macOS/Linux:**
   ```bash
   export GEMINI_API_KEY="your-api-key-here"
   ```

   **Windows (PowerShell):**
   ```powershell
   $env:GEMINI_API_KEY="your-api-key-here"
   ```

   **Windows (CMD):**
   ```cmd
   set GEMINI_API_KEY=your-api-key-here
   ```

   Or create a `.env` file in the `backend` directory:
   ```
   GEMINI_API_KEY=your-api-key-here
   ```

   **Note**: If you don't set the API key, Luna will use static tips (which still work great!).

### 3. Start the Server

```bash
npm start
# or for development with auto-reload:
npm run dev
```

The server will start on `http://localhost:3000`

### 4. Test the API

Open a new terminal and test:

```bash
# Health check
curl http://localhost:3000/health

# Get today's data
curl http://localhost:3000/today

# Get historical data
curl http://localhost:3000/data?days=14
```

### 5. Find Your Server IP

You'll need your computer's local IP address for the ESP32 to connect:

**macOS/Linux:**
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

**Windows:**
```bash
ipconfig
```

Look for your local network IP (usually starts with `192.168.` or `10.`)

**Note**: Make sure your computer and ESP32 are on the same WiFi network.

---

## Part 2: ESP32 Setup

### 1. Install Arduino IDE

Download from: https://www.arduino.cc/en/software

### 2. Add ESP32 Board Support

1. Open Arduino IDE
2. Go to **File → Preferences**
3. In "Additional Board Manager URLs", add:
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
4. Go to **Tools → Board → Boards Manager**
5. Search for "ESP32" and install "esp32 by Espressif Systems"

### 3. Install Required Libraries

Go to **Sketch → Include Library → Manage Libraries** and install:

- **OneWire** (by Paul Stoffregen)
- **DallasTemperature** (by Miles Burton)
- **Adafruit NeoPixel** (by Adafruit)

### 4. Configure the Code

Open `esp32/luna_esp32.ino` and update:

```cpp
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* serverURL = "http://YOUR_SERVER_IP:3000/temperature";
```

Replace:
- `YOUR_WIFI_SSID` with your WiFi network name
- `YOUR_WIFI_PASSWORD` with your WiFi password
- `YOUR_SERVER_IP` with the IP address from Part 1, Step 4

### 5. Upload to ESP32

1. Connect ESP32 via USB
2. Select board: **Tools → Board → ESP32 Arduino → ESP32 Dev Module**
3. Select port: **Tools → Port → [your ESP32 port]**
4. Click **Upload** (or press Ctrl+U / Cmd+U)
5. Open Serial Monitor (115200 baud) to see status

### 6. Test

- You should see WiFi connection messages
- LED ring should turn blue (ready state)
- Touch the button to take a reading
- Check Serial Monitor for temperature and server response

---

## Part 3: Frontend Setup

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Configure API URL (Optional)

If your backend is not on `localhost:3000`, create a `.env` file:

```bash
REACT_APP_API_URL=http://YOUR_SERVER_IP:3000
```

### 3. Start the Development Server

```bash
npm start
```

The app will open in your browser at `http://localhost:3000`

### 4. Build for Production (Optional)

```bash
npm run build
```

This creates an optimized build in the `build/` folder.

---

## Part 4: Testing the Complete System

### 1. Start Backend

```bash
cd backend
npm start
```

### 2. Start Frontend (in new terminal)

```bash
cd frontend
npm start
```

### 3. Test ESP32

1. Power on ESP32
2. Wait for WiFi connection (blue LED)
3. Touch button to take reading
4. Check frontend dashboard - should update with new reading

### 4. View Dashboard

Open `http://localhost:3000` in your browser. You should see:
- Today's summary card
- Widget simulation
- BBT trend graph (with sample data initially)

---

## Troubleshooting

### Backend Issues

**Port already in use:**
```bash
# Find process using port 3000
lsof -i :3000
# Kill it
kill -9 <PID>
```

**CORS errors:**
- Make sure `cors` package is installed
- Check that frontend URL is allowed

### ESP32 Issues

**WiFi won't connect:**
- Double-check SSID and password
- Ensure 2.4GHz WiFi (ESP32 doesn't support 5GHz)
- Check router settings

**Can't upload code:**
- Hold BOOT button while clicking Upload
- Try different USB cable/port
- Check drivers (CH340 or CP2102)

**Server connection fails:**
- Verify backend is running
- Check server IP in ESP32 code
- Ensure same WiFi network
- Test with: `curl http://YOUR_IP:3000/health`

### Frontend Issues

**Can't connect to backend:**
- Check `REACT_APP_API_URL` in `.env`
- Verify backend is running
- Check browser console for errors

**Graph not showing:**
- Check browser console for API errors
- Verify data format from `/data` endpoint

---

## Sample Data

The backend initializes with 14 days of sample BBT data for demo purposes. Real readings from ESP32 will be added to this data.

To reset sample data, restart the backend server.

---

## Next Steps

- Customize cycle phase logic in `backend/server.js`
- Adjust LED colors/phases in `esp32/luna_esp32.ino`
- Style the frontend dashboard in `frontend/src/`
- Add database persistence (replace in-memory storage)
- Deploy backend to cloud (Heroku, Railway, etc.)
- Deploy frontend to Netlify, Vercel, etc.

---

## Development Tips

### Backend Development

- Use `npm run dev` for auto-reload with nodemon
- Check server logs for API requests
- Test endpoints with Postman or curl

### Frontend Development

- React app auto-reloads on file changes
- Check browser DevTools console for errors
- Use React DevTools extension for debugging

### ESP32 Development

- Serial Monitor is your friend (115200 baud)
- Add `Serial.println()` for debugging
- Test individual components (sensor, WiFi, LED) separately

---

## Production Considerations

For a production deployment:

1. **Backend:**
   - Use a real database (PostgreSQL, MongoDB)
   - Add authentication
   - Use environment variables for secrets
   - Add rate limiting
   - Enable HTTPS

2. **Frontend:**
   - Build and serve static files
   - Use environment variables for API URL
   - Add error boundaries
   - Optimize bundle size

3. **ESP32:**
   - Add error recovery
   - Implement OTA updates
   - Add deep sleep for battery power
   - Store readings locally if WiFi fails

---

## Support

For issues or questions:
- Check WIRING.md for hardware problems
- Review Serial Monitor output for ESP32 issues
- Check browser console for frontend errors
- Review server logs for backend issues
