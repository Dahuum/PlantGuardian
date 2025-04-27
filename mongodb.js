import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// MongoDB connection string - should be in .env file
const MONGODB_URI = process.env.MONGODB_URI;

// Define Sensor Data Schema and Model
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

// Define Log Schema and Model
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

// Create the models
const SensorData = mongoose.models.SensorData || mongoose.model('SensorData', sensorDataSchema);
const Log = mongoose.models.Log || mongoose.model('Log', logSchema);

// Connect to MongoDB
const connectToDatabase = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      console.log('Already connected to MongoDB');
      return;
    }
    
    // Ensure we have a connection string
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }
    
    // Removed deprecated options
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB Atlas');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    throw error;
  }
};

// Function to save sensor data
const saveSensorData = async (data) => {
  try {
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

// Function to save servo control log
const saveServoLog = async (position) => {
  return saveLog('servo', `Servo position set to ${position}`, { position });
};

// Function to save system log
const saveSystemLog = async (message, data = {}) => {
  return saveLog('system', message, data);
};

// Function to save error log
const saveErrorLog = async (message, error) => {
  return saveLog('error', message, { 
    errorMessage: error.message, 
    stack: error.stack 
  });
};

// Function to get historical sensor data
const getHistoricalData = async (limit = 100, skip = 0) => {
  try {
    return await SensorData.find({})
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);
  } catch (error) {
    console.error('Error fetching historical data:', error);
    throw error;
  }
};

// Function to get logs with filtering options
const getLogs = async (options = {}) => {
  try {
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

export { 
  connectToDatabase, 
  saveSensorData, 
  saveServoLog,
  saveSystemLog,
  saveErrorLog,
  getHistoricalData,
  getLogs,
  SensorData,
  Log
};