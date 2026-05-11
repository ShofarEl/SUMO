# Installation Guide - Georgetown Traffic AI

## Current Status
- ✅ Python 3.13.7 installed
- ❌ Docker not installed
- ❌ Python dependencies not installed

---

## Step 1: Install Docker Desktop for Windows

### Download and Install

1. **Download Docker Desktop**
   - Visit: https://www.docker.com/products/docker-desktop/
   - Click "Download for Windows"
   - File: Docker Desktop Installer.exe

2. **System Requirements**
   - Windows 10 64-bit: Pro, Enterprise, or Education (Build 19041 or higher)
   - OR Windows 11 64-bit
   - WSL 2 feature enabled
   - 4GB RAM minimum (8GB recommended)

3. **Installation Steps**
   ```
   a. Run Docker Desktop Installer.exe
   b. Follow the installation wizard
   c. Enable WSL 2 when prompted (recommended)
   d. Restart your computer when installation completes
   ```

4. **Verify Installation**
   After restart, open PowerShell or Command Prompt and run:
   ```bash
   docker --version
   docker-compose --version
   ```
   
   You should see version numbers like:
   ```
   Docker version 24.0.x
   Docker Compose version v2.x.x
   ```

5. **Start Docker Desktop**
   - Launch Docker Desktop from Start Menu
   - Wait for Docker Engine to start (whale icon in system tray)
   - Ensure it shows "Docker Desktop is running"

### Troubleshooting Docker Installation

If you encounter issues:

**WSL 2 Not Installed:**
```powershell
# Run in PowerShell as Administrator
wsl --install
wsl --set-default-version 2
```

**Virtualization Not Enabled:**
- Restart computer and enter BIOS/UEFI
- Enable Intel VT-x or AMD-V
- Save and restart

**Docker Desktop Won't Start:**
- Check Windows Updates are current
- Ensure Hyper-V is enabled (Windows Features)
- Try running Docker Desktop as Administrator

---

## Step 2: Install Python Dependencies

### Option A: Using Virtual Environment (Recommended)

1. **Create Virtual Environment**
   ```bash
   cd python-ai
   python -m venv venv
   ```

2. **Activate Virtual Environment**
   
   **Windows Command Prompt:**
   ```cmd
   venv\Scripts\activate.bat
   ```
   
   **Windows PowerShell:**
   ```powershell
   venv\Scripts\Activate.ps1
   ```
   
   **Git Bash:**
   ```bash
   source venv/Scripts/activate
   ```

3. **Install Dependencies**
   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

4. **Verify Installation**
   ```bash
   pip list
   ```
   
   Should show packages including:
   - fastapi
   - scikit-learn
   - tensorflow
   - torch
   - pandas
   - numpy

### Option B: System-Wide Installation (Not Recommended)

```bash
cd python-ai
pip install -r requirements.txt
```

### Common Installation Issues

**Issue: TensorFlow/PyTorch Installation Fails**
```bash
# Install CPU versions explicitly
pip install tensorflow-cpu==2.15.0
pip install torch==2.1.1 --index-url https://download.pytorch.org/whl/cpu
```

**Issue: SUMO Not Found**
- SUMO installation is separate (see Step 3)
- Python will work without SUMO for ML models

**Issue: Permission Errors**
```bash
# Run as administrator or use --user flag
pip install --user -r requirements.txt
```

---

## Step 3: Install SUMO (Optional - for Simulation)

SUMO is required for traffic simulation but NOT for ML model training/prediction.

### Download SUMO

1. Visit: https://sumo.dlr.de/docs/Downloads.php
2. Download Windows installer (sumo-win64-x.x.x.msi)
3. Run installer and follow wizard
4. Default location: `C:\Program Files (x86)\Eclipse\Sumo`

### Set Environment Variable

**Windows:**
1. Search "Environment Variables" in Start Menu
2. Click "Environment Variables" button
3. Under "System Variables", click "New"
4. Variable name: `SUMO_HOME`
5. Variable value: `C:\Program Files (x86)\Eclipse\Sumo`
6. Click OK and restart terminal

**Verify:**
```bash
echo %SUMO_HOME%
```

---

## Step 4: Verify Complete Setup

### Test Python Dependencies

```bash
cd python-ai
python verify_rf_implementation.py
```

Expected output: All checks pass with ✓

### Test Docker

```bash
docker run hello-world
```

Expected output: "Hello from Docker!" message

### Test Docker Compose

```bash
docker-compose --version
```

Expected output: Version number

---

## Step 5: Start the Application

### Using Docker (Recommended)

1. **Build and Start All Services**
   ```bash
   docker-compose up --build
   ```

2. **Or use the provided script**
   ```bash
   # Windows Command Prompt
   docker-commands.bat up
   
   # Or manually
   docker-compose up -d
   ```

3. **Verify Services Running**
   ```bash
   docker-compose ps
   ```
   
   Should show:
   - frontend (port 3000)
   - backend (port 5000)
   - python-ai (port 8000)
   - mongodb (port 27017)
   - redis (port 6379)

4. **Access Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - Python AI API: http://localhost:8000/docs
   - MongoDB: mongodb://localhost:27017

### Using Local Development (Without Docker)

**Terminal 1 - MongoDB:**
```bash
# Install MongoDB separately or use Docker for just MongoDB
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

**Terminal 2 - Redis:**
```bash
# Install Redis separately or use Docker for just Redis
docker run -d -p 6379:6379 --name redis redis:latest
```

**Terminal 3 - Python AI Service:**
```bash
cd python-ai
# Activate virtual environment first
venv\Scripts\activate
python app/main.py
```

**Terminal 4 - Backend:**
```bash
cd backend
npm install
npm run dev
```

**Terminal 5 - Frontend:**
```bash
cd frontend
npm install
npm start
```

---

## Quick Start Commands

### After Everything is Installed

**Start all services:**
```bash
docker-compose up -d
```

**Stop all services:**
```bash
docker-compose down
```

**View logs:**
```bash
docker-compose logs -f
```

**Rebuild after code changes:**
```bash
docker-compose up --build
```

**Test Python ML service:**
```bash
cd python-ai
python test_random_forest.py
```

---

## Installation Checklist

- [ ] Docker Desktop installed and running
- [ ] Docker version verified (`docker --version`)
- [ ] Docker Compose version verified (`docker-compose --version`)
- [ ] Python virtual environment created
- [ ] Python dependencies installed (`pip install -r requirements.txt`)
- [ ] Python dependencies verified (`pip list`)
- [ ] SUMO installed (optional, for simulation)
- [ ] SUMO_HOME environment variable set (optional)
- [ ] Docker services started (`docker-compose up`)
- [ ] All services running (`docker-compose ps`)
- [ ] Frontend accessible (http://localhost:3000)
- [ ] Backend API accessible (http://localhost:5000)
- [ ] Python AI API accessible (http://localhost:8000/docs)

---

## Next Steps After Installation

1. **Test the Random Forest Model**
   ```bash
   cd python-ai
   python test_random_forest.py
   ```

2. **Access API Documentation**
   - Python AI: http://localhost:8000/docs
   - Interactive Swagger UI for testing endpoints

3. **Continue with Task Implementation**
   - Task 7.2 is complete
   - Ready to proceed with next tasks

---

## Getting Help

**Docker Issues:**
- Docker Desktop documentation: https://docs.docker.com/desktop/windows/
- Docker forums: https://forums.docker.com/

**Python Issues:**
- Check Python version: `python --version`
- Check pip version: `pip --version`
- Upgrade pip: `pip install --upgrade pip`

**SUMO Issues:**
- SUMO documentation: https://sumo.dlr.de/docs/
- SUMO user mailing list: https://www.eclipse.org/lists/sumo-user/

**Project Issues:**
- Check logs: `docker-compose logs`
- Restart services: `docker-compose restart`
- Rebuild: `docker-compose up --build`
