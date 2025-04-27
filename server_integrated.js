const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const next = require('next');
const mongoose = require('mongoose');
require('dotenv').config();

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

// MongoDB models
let SensorData;
let Log;

// Connect to MongoDB
const connectToDatabase = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      console.log('Already connected to MongoDB');
      return;
    }
    
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }
    
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Define schemas if they don't exist yet
    if (!SensorData) {
      const sensorDataSchema = new mongoose.Schema({
        timestamp: { type: Date, default: Date.now },
        moisture: Number,
        moistureStatus: String,
        light: Number,
        lightStatus: String,
        water: Number,
        waterStatus: String,
        temperature: Number,
        humidity: Number,
        servo: Number,
        raw: String
      });
      SensorData = mongoose.models.SensorData || mongoose.model('SensorData', sensorDataSchema);
    }

    if (!Log) {
      const logSchema = new mongoose.Schema({
        timestamp: { type: Date, default: Date.now },
        type: { 
          type: String, 
          enum: ['sensor', 'servo', 'system', 'error'],
          required: true 
        },
        message: { type: String, required: true },
        data: mongoose.Schema.Types.Mixed
      });
      Log = mongoose.models.Log || mongoose.model('Log', logSchema);
    }
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    throw error;
  }
};

// Save sensor data to MongoDB
const saveSensorData = async (data) => {
  try {
    if (!SensorData) return false;
    
    const newSensorData = new SensorData({
      timestamp: new Date(data.timestamp),
      moisture: data.moisture,
      moistureStatus: data.moistureStatus,
      light: data.light,
      lightStatus: data.lightStatus,
      water: data.water,
      waterStatus: data.waterStatus,
      temperature: data.temperature,
      humidity: data.humidity,
      servo: data.servo,
      raw: data.raw
    });
    
    await newSensorData.save();
    
    // Also save as a log entry
    await saveLog('sensor', `Sensor data received`, { raw: data.raw });
    
    console.log('Sensor data saved to MongoDB');
    return true;
  } catch (error) {
    console.error('Error saving to MongoDB:', error);
    return false;
  }
};

// Generic log saving function
const saveLog = async (type, message, data = {}) => {
  try {
    if (!Log) return false;
    
    const newLog = new Log({
      timestamp: new Date(),
      type,
      message,
      data
    });
    
    await newLog.save();
    return true;
  } catch (error) {
    console.error('Error saving log to MongoDB:', error);
    return false;
  }
};

// Specialized log functions
const saveServoLog = async (position) => {
  return saveLog('servo', `Servo position set to ${position}`, { position });
};

const saveSystemLog = async (message, data = {}) => {
  return saveLog('system', message, data);
};

const saveErrorLog = async (message, error) => {
  return saveLog('error', message, { 
    errorMessage: error.message, 
    stack: error.stack 
  });
};

// Get historical sensor data
const getHistoricalData = async (limit = 100, skip = 0) => {
  try {
    if (!SensorData) return [];
    return await SensorData.find({})
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);
  } catch (error) {
    console.error('Error fetching historical data:', error);
    throw error;
  }
};

// Get logs with filtering options
const getLogs = async (options = {}) => {
  try {
    if (!Log) return [];
    
    const { type, limit = 100, skip = 0, startDate, endDate } = options;
    
    let query = {};
    
    // Filter by type if provided
    if (type) {
      query.type = type;
    }
    
    // Filter by date range if provided
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) {
        query.timestamp.$gte = new Date(startDate);
      }
      if (endDate) {
        query.timestamp.$lte = new Date(endDate);
      }
    }
    
    return await Log.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);
  } catch (error) {
    console.error('Error fetching logs:', error);
    throw error;
  }
};

// Start the application
app.prepare().then(async () => {
  try {
    // Connect to MongoDB
    await connectToDatabase();
    saveSystemLog('Server initializing').catch(err => console.error('Error saving startup log:', err));
    
    const server = express();
    const port = 8080;

    // Create logs directory if it doesn't exist (for backward compatibility)
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
          saveErrorLog('Error parsing sensor data', error).catch(err => 
            console.error('Error saving error log:', err));
        }
        
        // Log data to file (backward compatibility)
        const logFilePath = path.join(logDir, `sensor_data_${new Date().toISOString().slice(0, 10)}.log`);
        const logEntry = `${sensorData.timestamp} - ${rawData}\n`;
        
        fs.appendFile(logFilePath, logEntry, (err) => {
          if (err) {
            console.error('Error writing to log file:', err);
            saveErrorLog('Error writing to file log', err).catch(e => 
              console.error('Error saving error log:', e));
          }
        });
        
        // Create/update CSV file with just the numeric values (backward compatibility)
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
            saveErrorLog('Error writing to CSV file', err).catch(e => 
              console.error('Error saving error log:', e));
          }
        });
        
        // Save to MongoDB
        saveSensorData(sensorData).catch(err => {
          console.error('Error saving to MongoDB:', err);
          saveErrorLog('Error saving sensor data to MongoDB', err).catch(e => 
            console.error('Error saving error log:', e));
        });
        
        // Send successful response
        res.status(200).json({ status: 'success', message: 'Data received' });
      } catch (error) {
        console.error('Error processing request:', error);
        saveErrorLog('Error processing data request', error).catch(err => 
          console.error('Error saving error log:', err));
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
        
        // Log the servo control request (backward compatibility)
        const logFilePath = path.join(logDir, `servo_control_${new Date().toISOString().slice(0, 10)}.log`);
        const logEntry = `${new Date().toISOString()} - Set servo to position: ${position}\n`;
        
        fs.appendFile(logFilePath, logEntry, (err) => {
          if (err) {
            console.error('Error writing to servo log file:', err);
            saveErrorLog('Error writing to servo log file', err).catch(e => 
              console.error('Error saving error log:', e));
          }
        });
        
        // Save servo log to MongoDB
        saveServoLog(position).catch(err => 
          console.error('Error saving servo log:', err));
        
        res.status(200).json({ 
          status: 'success', 
          message: 'Servo position request received', 
          position: position 
        });
      } catch (error) {
        console.error('Error processing servo request:', error);
        saveErrorLog('Error processing servo request', error).catch(err => 
          console.error('Error saving error log:', err));
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

    // NEW ROUTES: Historical data and logs
    
    // Route to get historical sensor data
    server.get('/data/history', async (req, res) => {
      try {
        const limit = parseInt(req.query.limit) || 100;
        const skip = parseInt(req.query.skip) || 0;

        const data = await getHistoricalData(limit, skip);
        res.json(data);
      } catch (error) {
        console.error('Error fetching history:', error);
        saveErrorLog('Error fetching sensor history', error).catch(err => 
          console.error('Error saving error log:', err));
        res.status(500).json({ error: error.message });
      }
    });

    // Route to get logs
    server.get('/logs', async (req, res) => {
      try {
        const { type, limit, skip, startDate, endDate } = req.query;

        const options = {
          type,
          limit: parseInt(limit) || 100,
          skip: parseInt(skip) || 0,
        };

        if (startDate) options.startDate = startDate;
        if (endDate) options.endDate = endDate;

        const logs = await getLogs(options);
        res.json(logs);
      } catch (error) {
        console.error('Error fetching logs:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // For all other routes, let Next.js handle them
    server.all('*', (req, res) => {
      return handle(req, res);
    });

    // Start the server
    server.listen(port, '0.0.0.0', () => {
      console.log(`Server listening at http://localhost:${port}`);
      saveSystemLog(`Server started and listening on port ${port}`).catch(err => 
        console.error('Error saving startup log:', err));
    });
  } catch (err) {
    console.error('Error setting up server:', err);
    saveErrorLog('Error setting up server', err).catch(e => 
      console.error('Error saving error log:', e));
  }
}).catch(err => {
  console.error('Error preparing Next.js app:', err);
});