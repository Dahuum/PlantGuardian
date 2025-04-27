import express from "express";
import bodyParser from "body-parser";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  connectToDatabase,
  saveSensorData,
  getHistoricalData,
  saveServoLog,
  saveSystemLog,
  saveErrorLog,
  getLogs,
} from "./mongodb.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  raw: "",
};

// Connect to MongoDB
connectToDatabase()
  .then(() => {
    console.log("MongoDB connection ready");
    saveSystemLog("Server started successfully").catch((err) =>
      console.error("Error saving startup log:", err),
    );
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });

// Create Express server
const server = express();
const port = 8080;

// Create logs directory if it doesn't exist
const logDir = path.join(__dirname, "logs");
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Configure Express middleware
server.use(bodyParser.json());
server.use(express.static("public"));

// Route to receive data from ESP32
server.post("/data", (req, res) => {
  try {
    const rawData = req.body.data;
    console.log(`Received data: ${rawData}`);

    // Update the raw data
    sensorData.raw = rawData;
    sensorData.timestamp = new Date().toISOString();

    // Parse the data string (expected format: "Moisture:1234,DRY,Light:3456,BRIGHT,Water:789,MEDIUM,Temp:25.0,Humid:60.0,Servo:90")
    try {
      console.log("Parsing sensor data format:", rawData);
      const parts = rawData.split(",");

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
        if (part.includes(":")) {
          const [key, value] = part.split(":");

          if (key === "Moisture") {
            sensorData.moisture = parseInt(value);
            // The moisture status should be the next part
            if (i + 1 < parts.length && !parts[i + 1].includes(":")) {
              sensorData.moistureStatus = parts[i + 1].trim();
            }
          } else if (key === "Light") {
            sensorData.light = parseInt(value);
            // The light status should be the next part
            if (i + 1 < parts.length && !parts[i + 1].includes(":")) {
              sensorData.lightStatus = parts[i + 1].trim();
            }
          } else if (key === "Water") {
            sensorData.water = parseInt(value);
            // The water status should be the next part
            if (i + 1 < parts.length && !parts[i + 1].includes(":")) {
              sensorData.waterStatus = parts[i + 1].trim();
            }
          } else if (key === "Temp") {
            sensorData.temperature = parseFloat(value);
          } else if (key === "Humid") {
            sensorData.humidity = parseFloat(value);
          } else if (key === "Servo") {
            sensorData.servo = parseInt(value);
          }
        }
      }

      console.log("Parsed sensor data:", sensorData);
    } catch (error) {
      console.error("Error parsing sensor data:", error);
      saveErrorLog("Error parsing sensor data", error).catch((err) =>
        console.error("Error saving error log:", err),
      );
    }

    // Log data to file as backup
    const logFilePath = path.join(
      logDir,
      `sensor_data_${new Date().toISOString().slice(0, 10)}.log`,
    );
    const logEntry = `${sensorData.timestamp} - ${rawData}\n`;

    fs.appendFile(logFilePath, logEntry, (err) => {
      if (err) {
        console.error("Error writing to log file:", err);
        saveErrorLog("Error writing to file log", err).catch((e) =>
          console.error("Error saving error log:", e),
        );
      }
    });

    // Save to MongoDB
    saveSensorData(sensorData).catch((err) => {
      console.error("Error saving to MongoDB:", err);
      saveErrorLog("Error saving sensor data to MongoDB", err).catch((e) =>
        console.error("Error saving error log:", e),
      );
    });

    // Send successful response
    res.status(200).json({ status: "success", message: "Data received" });
  } catch (error) {
    console.error("Error processing request:", error);
    saveErrorLog("Error processing data request", error).catch((err) =>
      console.error("Error saving error log:", err),
    );
    res.status(500).json({ status: "error", message: error.message });
  }
});

// Route to get the latest sensor data
server.get("/data", (_, res) => {
  res.json(sensorData);
});

// Route to control the servo
server.post("/servo", (req, res) => {
  try {
    const position = req.body.position;
    console.log(`Setting servo position to: ${position}`);

    // We don't have direct control over the servo from the server,
    // so we'll store the requested position and wait for the ESP32 to poll for it
    sensorData.requestedServoPosition = position;

    // Log the servo control request
    const logFilePath = path.join(
      logDir,
      `servo_control_${new Date().toISOString().slice(0, 10)}.log`,
    );
    const logEntry = `${new Date().toISOString()} - Set servo to position: ${position}\n`;

    fs.appendFile(logFilePath, logEntry, (err) => {
      if (err) {
        console.error("Error writing to servo log file:", err);
        saveErrorLog("Error writing to servo log file", err).catch((e) =>
          console.error("Error saving error log:", e),
        );
      }
    });

    // Save servo log to MongoDB
    saveServoLog(position).catch((err) =>
      console.error("Error saving servo log:", err),
    );

    res.status(200).json({
      status: "success",
      message: "Servo position request received",
      position: position,
    });
  } catch (error) {
    console.error("Error processing servo request:", error);
    saveErrorLog("Error processing servo request", error).catch((err) =>
      console.error("Error saving error log:", err),
    );
    res.status(500).json({ status: "error", message: error.message });
  }
});

// Route for ESP32 to check for servo control requests
server.get("/servo-check", (_, res) => {
  if (sensorData.requestedServoPosition !== undefined) {
    // Get the requested position
    const position = sensorData.requestedServoPosition;

    // Clear the requested position after sending it
    sensorData.requestedServoPosition = undefined;

    // Return the position to the ESP32
    res.status(200).json({ status: "success", position: position });
  } else {
    // No pending request
    res.status(200).json({ status: "no_request" });
  }
});

// Route to get historical sensor data
server.get("/data/history", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const skip = parseInt(req.query.skip) || 0;

    const data = await getHistoricalData(limit, skip);
    res.json(data);
  } catch (error) {
    console.error("Error fetching history:", error);
    saveErrorLog("Error fetching sensor history", error).catch((err) =>
      console.error("Error saving error log:", err),
    );
    res.status(500).json({ error: error.message });
  }
});

// Route to get logs
server.get("/logs", async (req, res) => {
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
    console.error("Error fetching logs:", error);
    res.status(500).json({ error: error.message });
  }
});

// Serve a simple HTML page for testing
// server.get('/', (_, res) => {
//   res.send(`
//     <!DOCTYPE html>
//     <html>
//     <head>
//       <title>Plant Monitoring Server</title>
//       <style>
//         body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
//         h1 { color: #4CAF50; }
//         .container { max-width: 800px; margin: 0 auto; }
//         .card { border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
//         pre { background: #f4f4f4; padding: 10px; border-radius: 5px; overflow-x: auto; }
//       </style>
//     </head>
//     <body>
//       <div class="container">
//         <h1>Plant Monitoring Server</h1>
//         <div class="card">
//           <h2>Server Status</h2>
//           <p>Server is running correctly.</p>
//           <p>Current time: ${new Date().toISOString()}</p>
//         </div>
//         <div class="card">
//           <h2>API Endpoints</h2>
//           <ul>
//             <li><strong>POST /data</strong> - Send sensor data from ESP32</li>
//             <li><strong>GET /data</strong> - Get latest sensor readings</li>
//             <li><strong>GET /data/history</strong> - Get historical sensor data</li>
//             <li><strong>POST /servo</strong> - Control servo position</li>
//             <li><strong>GET /servo-check</strong> - Check for pending servo commands</li>
//             <li><strong>GET /logs</strong> - Get system logs</li>
//           </ul>
//         </div>
//         <div class="card">
//           <h2>Latest Sensor Data</h2>
//           <pre id="sensor-data">Loading...</pre>
//         </div>
//       </div>
//       <script>
//         // Fetch and display the latest sensor data
//         async function updateSensorData() {
//           try {
//             const response = await fetch('/data');
//             const data = await response.json();
//             document.getElementById('sensor-data').textContent = JSON.stringify(data, null, 2);
//           } catch (error) {
//             document.getElementById('sensor-data').textContent = 'Error fetching data: ' + error.message;
//           }
//         }

//         // Update initially and every 5 seconds
//         updateSensorData();
//         setInterval(updateSensorData, 5000);
//       </script>
//     </body>
//     </html>
//   `);
// });

// Start the server
server.listen(port, "0.0.0.0", () => {
  console.log(`Server listening at http://localhost:${port}`);
  saveSystemLog(`Server started and listening on port ${port}`).catch((err) =>
    console.error("Error saving startup log:", err),
  );
});
