# Georgetown Traffic AI - Quick Start Guide

## Prerequisites

1. **MongoDB Atlas** - Cloud database (already configured)
2. **Node.js** - v16 or higher
3. **Python** - v3.8 or higher
4. **SUMO** - Traffic simulation software (optional for full functionality)

## Step-by-Step Startup

### 1. MongoDB (Already Set Up!)

The project uses **MongoDB Atlas** (cloud-hosted), so you don't need to install or run MongoDB locally. The connection is already configured in the `.env` files.

### 2. Start Backend API (Port 5000)

```bash
cd backend
npm install
npm start
```

Expected output:
```
Server running in development mode on http://localhost:5000
MongoDB connected successfully
```

### 3. Start Python AI Service (Port 8000)

```bash
cd python-ai
pip install -r requirements.txt
python -m app.main
```

Expected output:
```
INFO:     Started server process
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### 4. Start Frontend (Port 5174)

```bash
cd frontend
npm install
npm run dev
```

Expected output:
```
VITE ready in XXX ms
Local: http://localhost:5174/
```

## Verify Services

Run the verification script:

```bash
verify-services.bat
```

Or manually check:
- Backend: http://localhost:5000/health
- Python AI: http://localhost:8000/health
- Frontend: http://localhost:5174

**Note:** MongoDB verification removed since we're using MongoDB Atlas (cloud)

## Import Georgetown Network

1. Open browser to http://localhost:5174
2. Login with your credentials
3. Navigate to "Map" page
4. Click "Import Georgetown Network" button
5. Wait for import to complete (may take 1-2 minutes)

## Troubleshooting

### Backend won't start
- Check internet connection (needs to connect to MongoDB Atlas)
- Verify `.env` file exists in backend directory with correct MongoDB URI
- Check port 5000 is not in use

### Python AI won't start
- Check internet connection (needs to connect to MongoDB Atlas)
- Check if all Python dependencies are installed
- Verify `python-ai/.env` file exists with correct MongoDB URI
- Check port 8000 is not in use

### Import Network fails
- Ensure Python AI service is running
- Check internet connection (downloads from OpenStreetMap AND connects to MongoDB Atlas)
- Verify SUMO_HOME environment variable if using SUMO features

### Chart data 400 error
- This has been fixed - ensure you're using the latest code
- The `chartType` parameter is now properly validated

## Environment Files

### backend/.env
```
MONGODB_URI=mongodb+srv://tuboksmicheal:mf68PoVkpn7FGXNM@sumo-cluster.i8gojxe.mongodb.net/
PYTHON_AI_SERVICE_URL=http://localhost:8000
PORT=5000
JWT_SECRET=dev-secret-key-change-in-production-12345
NODE_ENV=development
```

### python-ai/.env
```
MONGODB_URI=mongodb+srv://tuboksmicheal:mf68PoVkpn7FGXNM@sumo-cluster.i8gojxe.mongodb.net/
MONGODB_URL=mongodb+srv://tuboksmicheal:mf68PoVkpn7FGXNM@sumo-cluster.i8gojxe.mongodb.net
DATABASE_NAME=georgetown-traffic-ai
PORT=8000
ENVIRONMENT=development
```

**Important:** The connection string does NOT include the database name. The Python service uses `DATABASE_NAME` to specify which database to use, and MongoDB will create it automatically if it doesn't exist.

### frontend/.env
```
VITE_API_URL=http://localhost:5000/api
VITE_WS_URL=http://localhost:5000
VITE_ENV=development
```

## Common Commands

### Backend
```bash
npm start          # Start server
npm run dev        # Start with nodemon (auto-reload)
npm test           # Run tests
```

### Python AI
```bash
python -m app.main              # Start service
python -m pytest tests/         # Run tests
```

### Frontend
```bash
npm run dev        # Start development server
npm run build      # Build for production
npm test           # Run tests
```

## Next Steps

After successful startup:

1. **Import Network** - Get Georgetown road network data
2. **Configure Signals** - Set up traffic signal timing
3. **Run Simulation** - Test traffic scenarios
4. **View Analytics** - Analyze performance metrics
5. **Train RL Agent** - Optimize signal control with AI

## Support

If you encounter issues:
1. Check all services are running
2. Review error logs in console
3. Verify environment variables
4. Check network connectivity
5. Refer to IMPORT_NETWORK_FIX.md for detailed troubleshooting
