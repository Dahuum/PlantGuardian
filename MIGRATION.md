# Plant Monitoring System Migration Guide

## Migration from File-based Storage to MongoDB

This document explains how to migrate from the file-based storage system to the new MongoDB-based solution.

### Files Overview

- `server.js` - Original server using file-based storage
- `server_integrated.js` - New server with MongoDB integration while maintaining Next.js compatibility
- `mongodb.js` - MongoDB connection and data models

### Migration Steps

1. Install required dependencies:
   ```bash
   npm install mongoose dotenv
   ```

2. Set up environment variables:
   - Create a `.env` file in your project root
   - Add your MongoDB connection string: `MONGODB_URI=mongodb://your-connection-string`

3. Start the new integrated server:
   ```bash
   npm start
   ```

### Key Features Added

- MongoDB data persistence
- System logging
- Error tracking
- Historical data access via API
- Dual storage (files + MongoDB) for backward compatibility

### New API Endpoints

- `GET /data/history` - Retrieve historical sensor data
- `GET /logs` - Access system, error, and operation logs

### Backward Compatibility

The new integrated server maintains all the existing functionality while adding MongoDB storage:

- Still creates log files and CSV for backward compatibility
- Maintains same API endpoints for ESP32 communication
- Preserves Next.js integration for frontend

### Troubleshooting

If you encounter any issues:

1. Check MongoDB connection in `.env` file
2. Verify MongoDB is accessible from your server
3. Check server logs for detailed error messages
4. Ensure all required dependencies are installed