/*
 * Luna - Menstrual Cycle Companion
 * ESP32 Code for BBT Reading and Data Transmission
 * 
 * Hardware:
 * - ESP32 DevKit
 * - DS18B20 Temperature Sensor (OneWire)
 * - Capacitive Touch Button (GPIO 4)
 * - NeoPixel LED Ring (WS2812B, GPIO 2, 12 LEDs)
 * 
 * Libraries Required:
 * - WiFi (built-in)
 * - HTTPClient (built-in)
 * - OneWire
 * - DallasTemperature
 * - Adafruit_NeoPixel
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <Adafruit_NeoPixel.h>

// ========== CONFIGURATION ==========
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* serverURL = "http://YOUR_SERVER_IP:3000/temperature"; // Update with your server IP

// Pin Definitions
#define TOUCH_PIN 4          // Capacitive touch button
#define ONE_WIRE_BUS 5       // DS18B20 data pin
#define LED_PIN 2            // NeoPixel data pin
#define LED_COUNT 12         // Number of LEDs in ring

// Touch threshold (adjust based on your setup)
#define TOUCH_THRESHOLD 40

// ========== GLOBAL OBJECTS ==========
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);
Adafruit_NeoPixel pixels(LED_COUNT, LED_PIN, NEO_GRB + NEO_KHZ800);

// ========== STATE VARIABLES ==========
bool lastTouchState = false;
unsigned long lastReadingTime = 0;
const unsigned long READING_COOLDOWN = 5000; // 5 seconds between readings

// ========== SETUP ==========
void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n=== Luna ESP32 Starting ===");
  
  // Initialize NeoPixel
  pixels.begin();
  pixels.setBrightness(50); // Set brightness (0-255)
  pixels.clear();
  pixels.show();
  
  // Initialize temperature sensor
  sensors.begin();
  Serial.print("Found ");
  Serial.print(sensors.getDeviceCount(), DEC);
  Serial.println(" temperature sensor(s).");
  
  // Connect to WiFi
  connectToWiFi();
  
  // Set LED to blue (connecting/ready state)
  setLEDPhase("ready");
  
  Serial.println("Setup complete. Touch button to take reading.");
}

// ========== MAIN LOOP ==========
void loop() {
  // Check WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected. Reconnecting...");
    connectToWiFi();
  }
  
  // Read touch button
  int touchValue = touchRead(TOUCH_PIN);
  bool currentTouchState = (touchValue < TOUCH_THRESHOLD);
  
  // Detect touch press (edge detection)
  if (currentTouchState && !lastTouchState) {
    unsigned long currentTime = millis();
    
    // Cooldown check
    if (currentTime - lastReadingTime > READING_COOLDOWN) {
      Serial.println("\n--- Touch detected! Taking reading... ---");
      takeReading();
      lastReadingTime = currentTime;
    } else {
      Serial.println("Please wait before taking another reading.");
    }
  }
  
  lastTouchState = currentTouchState;
  
  delay(100); // Small delay to debounce
}

// ========== FUNCTIONS ==========

void connectToWiFi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi connected!");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
    setLEDPhase("ready");
  } else {
    Serial.println("\nWiFi connection failed!");
    setLEDPhase("error");
  }
}

void takeReading() {
  // Visual feedback: yellow (reading)
  setLEDPhase("reading");
  
  // Read temperature
  sensors.requestTemperatures();
  float temperature = sensors.getTempCByIndex(0);
  
  if (temperature == DEVICE_DISCONNECTED_C) {
    Serial.println("Error: Could not read temperature");
    setLEDPhase("error");
    return;
  }
  
  Serial.print("Temperature: ");
  Serial.print(temperature);
  Serial.println(" °C");
  
  // Create JSON payload
  String jsonPayload = createJSONPayload(temperature);
  Serial.println("Payload: " + jsonPayload);
  
  // Send to server
  bool success = sendToServer(jsonPayload);
  
  if (success) {
    Serial.println("✓ Reading sent successfully!");
    setLEDPhase("success");
    delay(1000);
    setLEDPhase("ready");
  } else {
    Serial.println("✗ Failed to send reading");
    setLEDPhase("error");
    delay(2000);
    setLEDPhase("ready");
  }
}

String createJSONPayload(float temperature) {
  // Get current timestamp (Unix epoch in seconds)
  unsigned long timestamp = WiFi.getTime();
  if (timestamp == 0) {
    // Fallback: use millis() if NTP not synced
    timestamp = millis() / 1000;
  }
  
  String json = "{";
  json += "\"temperature\":" + String(temperature, 2) + ",";
  json += "\"timestamp\":" + String(timestamp);
  json += "}";
  
  return json;
}

bool sendToServer(String payload) {
  HTTPClient http;
  
  http.begin(serverURL);
  http.addHeader("Content-Type", "application/json");
  
  int httpResponseCode = http.POST(payload);
  
  bool success = false;
  if (httpResponseCode > 0) {
    Serial.print("HTTP Response code: ");
    Serial.println(httpResponseCode);
    String response = http.getString();
    Serial.println("Response: " + response);
    success = (httpResponseCode == 200 || httpResponseCode == 201);
  } else {
    Serial.print("Error code: ");
    Serial.println(httpResponseCode);
  }
  
  http.end();
  return success;
}

void setLEDPhase(String phase) {
  pixels.clear();
  
  if (phase == "ready") {
    // Blue: Ready/connected
    for (int i = 0; i < LED_COUNT; i++) {
      pixels.setPixelColor(i, pixels.Color(0, 0, 255));
    }
  } else if (phase == "reading") {
    // Yellow: Taking reading
    for (int i = 0; i < LED_COUNT; i++) {
      pixels.setPixelColor(i, pixels.Color(255, 255, 0));
    }
  } else if (phase == "success") {
    // Green: Success
    for (int i = 0; i < LED_COUNT; i++) {
      pixels.setPixelColor(i, pixels.Color(0, 255, 0));
    }
  } else if (phase == "error") {
    // Red: Error
    for (int i = 0; i < LED_COUNT; i++) {
      pixels.setPixelColor(i, pixels.Color(255, 0, 0));
    }
  } else if (phase == "menstrual") {
    // Red: Menstrual phase
    for (int i = 0; i < LED_COUNT; i++) {
      pixels.setPixelColor(i, pixels.Color(200, 0, 50));
    }
  } else if (phase == "follicular") {
    // Green: Follicular phase
    for (int i = 0; i < LED_COUNT; i++) {
      pixels.setPixelColor(i, pixels.Color(0, 200, 100));
    }
  } else if (phase == "ovulation") {
    // Orange: Ovulation
    for (int i = 0; i < LED_COUNT; i++) {
      pixels.setPixelColor(i, pixels.Color(255, 165, 0));
    }
  } else if (phase == "luteal") {
    // Purple: Luteal phase
    for (int i = 0; i < LED_COUNT; i++) {
      pixels.setPixelColor(i, pixels.Color(150, 0, 200));
    }
  }
  
  pixels.show();
}
