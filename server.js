const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// Store received data in memory for immediate access
let sensorData = {
  timestamp: new Date().toISOString(),
  moisture: null,
  moistureStatus: null,
  light: null,
  lightStatus: null,
  water: null,
  waterStatus: null,
  temperature: null,
  humidity: null,
  servo: null,
  raw: ''
};

app.prepare().then(() => {
  const server = express();
  const port = 8080;

  // Create logs directory if it doesn't exist
  const logDir = path.join(__dirname, 'logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  // Configure Express middleware
  server.use(bodyParser.json());
  server.use(express.static('public'));

  // Route to receive data from ESP32
  server.post('/data', (req, res) => {
    try {
      const rawData = req.body.data;
      console.log(`Received data: ${rawData}`);
      
      // Update the raw data
      sensorData.raw = rawData;
      sensorData.timestamp = new Date().toISOString();
      
      // Parse the data string (expected format: "Moisture:1234,DRY,Light:3456,BRIGHT,Water:789,MEDIUM,Temp:25.0,Humid:60.0,Servo:90")
      try {
        console.log('Parsing sensor data format:', rawData);
        const parts = rawData.split(',');
        
        // Reset all sensor values so we don't keep old values if they're not in the new data
        sensorData.moisture = null;
        sensorData.moistureStatus = null;
        sensorData.light = null;
        sensorData.lightStatus = null;
        sensorData.water = null;
        sensorData.waterStatus = null;
        sensorData.temperature = null;
        sensorData.humidity = null;
        sensorData.servo = null;
        
        // More robust parsing - handle any order and missing parts
        for (let i = 0; i < parts.length; i++) {
          const part = parts[i].trim();
          
          // Handle parts with key:value format
          if (part.includes(':')) {
            const [key, value] = part.split(':');
            
            if (key === 'Moisture') {
              sensorData.moisture = parseInt(value);
              // The moisture status should be the next part
              if (i + 1 < parts.length && !parts[i + 1].includes(':')) {
                sensorData.moistureStatus = parts[i + 1].trim();
              }
            } else if (key === 'Light') {
              sensorData.light = parseInt(value);
              // The light status should be the next part
              if (i + 1 < parts.length && !parts[i + 1].includes(':')) {
                sensorData.lightStatus = parts[i + 1].trim();
              }
            } else if (key === 'Water') {
              sensorData.water = parseInt(value);
              // The water status should be the next part
              if (i + 1 < parts.length && !parts[i + 1].includes(':')) {
                sensorData.waterStatus = parts[i + 1].trim();
              }
            } else if (key === 'Temp') {
              sensorData.temperature = parseFloat(value);
            } else if (key === 'Humid') {
              sensorData.humidity = parseFloat(value);
            } else if (key === 'Servo') {
              sensorData.servo = parseInt(value);
            }
          }
        }
        
        console.log('Parsed sensor data:', sensorData);
      } catch (error) {
        console.error('Error parsing sensor data:', error);
      }
      
      // Log data to file
      const logFilePath = path.join(logDir, `sensor_data_${new Date().toISOString().slice(0, 10)}.log`);
      const logEntry = `${sensorData.timestamp} - ${rawData}\n`;
      
      fs.appendFile(logFilePath, logEntry, (err) => {
        if (err) {
          console.error('Error writing to log file:', err);
        }
      });
      
      // Create/update CSV file with just the numeric values
      const csvFilePath = path.join(logDir, 'sensors_data.csv');
      
      // Check if file exists to decide whether to add headers
      const fileExists = fs.existsSync(csvFilePath);
      
      // Create CSV row with timestamp and sensor values
      let csvRow = `${sensorData.timestamp},${sensorData.moisture},${sensorData.light},${sensorData.water},${sensorData.temperature},${sensorData.humidity}\n`;
      
      // If file doesn't exist, add CSV headers first
      if (!fileExists) {
        const csvHeaders = 'timestamp,moisture,light,water,temperature,humidity\n';
        csvRow = csvHeaders + csvRow;
      }
      
      // Write/append to CSV file
      fs.appendFile(csvFilePath, csvRow, (err) => {
        if (err) {
          console.error('Error writing to CSV file:', err);
        }
      });
      
      // Send successful response
      res.status(200).json({ status: 'success', message: 'Data received' });
    } catch (error) {
      console.error('Error processing request:', error);
      res.status(500).json({ status: 'error', message: error.message });
    }
  });

  // Route to get the latest sensor data
  server.get('/data', (req, res) => {
    res.json(sensorData);
  });

  // Route to control the servo
  server.post('/servo', (req, res) => {
    try {
      const position = req.body.position;
      console.log(`Setting servo position to: ${position}`);
      
      // We don't have direct control over the servo from the server,
      // so we'll store the requested position and wait for the ESP32 to poll for it
      sensorData.requestedServoPosition = position;
      
      // Log the servo control request
      const logFilePath = path.join(logDir, `servo_control_${new Date().toISOString().slice(0, 10)}.log`);
      const logEntry = `${new Date().toISOString()} - Set servo to position: ${position}\n`;
      
      fs.appendFile(logFilePath, logEntry, (err) => {
        if (err) {
          console.error('Error writing to servo log file:', err);
        }
      });
      
      res.status(200).json({ status: 'success', message: 'Servo position request received', position: position });
    } catch (error) {
      console.error('Error processing servo request:', error);
      res.status(500).json({ status: 'error', message: error.message });
    }
  });

  // Route for ESP32 to check for servo control requests
  server.get('/servo-check', (req, res) => {
    if (sensorData.requestedServoPosition !== undefined) {
      // Get the requested position
      const position = sensorData.requestedServoPosition;
      
      // Clear the requested position after sending it
      sensorData.requestedServoPosition = undefined;
      
      // Return the position to the ESP32
      res.status(200).json({ status: 'success', position: position });
    } else {
      // No pending request
      res.status(200).json({ status: 'no_request' });
    }
  });

  // For all other routes, let Next.js handle them
  server.all('*', (req, res) => {
    return handle(req, res);
  });

  // Start the server
  server.listen(port, '0.0.0.0', () => {
    console.log(`Server listening at http://localhost:${port}`);
  });
}).catch(err => {
  console.error('Error starting server:', err);
});
