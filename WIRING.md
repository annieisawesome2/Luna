# Luna Hardware Wiring Guide

## Components Required

- ESP32 DevKit (e.g., ESP32-WROOM-32)
- DS18B20 Temperature Sensor (waterproof version recommended)
- 4.7kΩ resistor (for DS18B20 pull-up)
- Capacitive touch pad/button (or use ESP32's built-in touch pins)
- NeoPixel LED Ring (WS2812B, 12 LEDs)
- USB cable for power (or battery pack)
- Breadboard and jumper wires

## Pin Connections

### ESP32 Pinout

```
ESP32 DevKit Pin Layout:
┌─────────────────┐
│  [USB]          │
│                 │
│  GND  GND      │
│  GPIO2  GPIO4  │
│  GPIO5  ...    │
│  ...   ...     │
└─────────────────┘
```

### Wiring Diagram

```
┌─────────────┐
│   ESP32     │
│             │
│  GPIO 2 ────┼───> NeoPixel Data (DIN)
│  GPIO 4 ────┼───> Touch Button
│  GPIO 5 ────┼───> DS18B20 Data
│  3.3V   ────┼───> DS18B20 VCC
│             │     4.7kΩ ────┼───> DS18B20 Data (pull-up)
│  GND    ────┼───> DS18B20 GND
│             │     NeoPixel GND
│             │     NeoPixel VCC ────> 5V (external if needed)
└─────────────┘
```

## Detailed Connections

### 1. DS18B20 Temperature Sensor

```
DS18B20 Pinout:
- Red wire (VCC)  → ESP32 3.3V
- Black wire (GND) → ESP32 GND
- Yellow wire (Data) → ESP32 GPIO 5
                    → 4.7kΩ resistor → ESP32 3.3V (pull-up)
```

**Note**: The DS18B20 requires a 4.7kΩ pull-up resistor between the data line and VCC.

### 2. Capacitive Touch Button

```
Touch Pad → ESP32 GPIO 4
```

**Alternative**: You can use a physical button:
- One side → ESP32 GPIO 4
- Other side → ESP32 GND

### 3. NeoPixel LED Ring (WS2812B)

```
NeoPixel Ring:
- VCC (5V) → ESP32 5V (or external 5V power supply)
- GND      → ESP32 GND
- DIN      → ESP32 GPIO 2
```

**Power Note**: If using more than 8-10 LEDs at full brightness, consider using an external 5V power supply. Connect:
- NeoPixel VCC → External 5V
- NeoPixel GND → ESP32 GND (common ground)
- NeoPixel DIN → ESP32 GPIO 2

### 4. Power

- **USB Power**: Connect ESP32 via USB cable to computer or USB power adapter
- **Battery Power**: Use a USB battery pack (5V, 1A minimum recommended)

## Assembly Steps

1. **Place ESP32 on breadboard** (or use jumper wires)

2. **Connect DS18B20**:
   - VCC → 3.3V
   - GND → GND
   - Data → GPIO 5
   - Add 4.7kΩ resistor between Data and 3.3V

3. **Connect Touch Button**:
   - Connect to GPIO 4
   - If using physical button, connect other side to GND

4. **Connect NeoPixel Ring**:
   - VCC → 5V (or external supply)
   - GND → GND
   - DIN → GPIO 2

5. **Power up**:
   - Connect USB cable to ESP32
   - LED ring should light up (blue = ready state)

## Testing

1. Upload the Arduino code to ESP32
2. Open Serial Monitor (115200 baud)
3. You should see:
   - WiFi connection status
   - Temperature sensor detection
   - "Touch button to take reading" message

4. Touch the button - you should see:
   - LED ring turns yellow (reading)
   - Temperature reading in Serial Monitor
   - LED ring turns green (success) or red (error)

## Troubleshooting

### DS18B20 Not Detected
- Check wiring (especially data line)
- Verify 4.7kΩ pull-up resistor is connected
- Try a different GPIO pin (update code)
- Check sensor with multimeter

### Touch Button Not Working
- Adjust `TOUCH_THRESHOLD` in code (try values 20-60)
- Check GPIO 4 connection
- Use `touchRead(4)` in Serial Monitor to test raw values

### NeoPixel Not Working
- Verify DIN is connected to GPIO 2
- Check power supply (5V, sufficient current)
- Try reducing brightness in code: `pixels.setBrightness(30)`
- Ensure common ground between ESP32 and NeoPixel

### WiFi Connection Issues
- Double-check SSID and password in code
- Ensure ESP32 is within WiFi range
- Check router settings (some routers block new devices)

### Server Connection Failed
- Verify backend server is running
- Check server URL in ESP32 code matches your computer's IP
- Test with: `curl http://YOUR_IP:3000/health`
- Ensure firewall allows port 3000

## Optional: Enclosure

For a finished product, consider:
- 3D printed case
- Waterproof enclosure for DS18B20 sensor
- Mounting for touch button
- Clear cover for LED ring visibility

## Safety Notes

- Do not exceed ESP32's voltage limits (3.3V for GPIO, 5V for VIN)
- Use appropriate current ratings for power supply
- Keep sensor away from heat sources when taking readings
- Clean sensor between uses if used orally
