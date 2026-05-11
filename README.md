# Georgetown Traffic AI Management System

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-19.2-61dafb.svg)](https://reactjs.org/)

A comprehensive AI-driven traffic management research platform for Georgetown, Guyana, evaluating machine learning prediction models and reinforcement learning-based adaptive signal control through simulation-based analysis.

## 🎯 Project Overview

This Master's thesis research project investigates the application of Artificial Intelligence techniques to predict and manage urban traffic congestion in Georgetown, Guyana. The system demonstrates:

- **35.8% reduction** in average vehicle delay (42.7s → 27.5s)
- **39.6% reduction** in queue lengths
- **LSTM prediction** with RMSE of 0.0263 and MAE of 0.02
- **Multi-agent coordination** improving network throughput by 15-25%

## 📁 Project Structure

```
georgetown-traffic-ai/
├── frontend/              # React.js frontend (Vite)
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/        # Page components
│   │   ├── contexts/     # React contexts
│   │   └── styles/       # CSS styles
│   └── package.json
├── backend/              # Node.js/Express backend API
│   ├── src/
│   │   ├── controllers/  # Request handlers
│   │   ├── models/       # MongoDB models
│   │   ├── routes/       # API routes
│   │   ├── services/     # Business logic
│   │   └── middleware/   # Express middleware
│   └── package.json
├── python-ai/            # Python/FastAPI AI service
│   ├── app/
│   │   ├── api/         # FastAPI endpoints
│   │   ├── services/    # ML/RL/SUMO services
│   │   └── models/      # Data models
│   └── requirements.txt
├── docker-compose.yml    # Docker orchestration
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- **Docker Engine 20.10+** and **Docker Compose 2.0+**
- At least **8GB RAM** available for Docker
- **20GB free disk space**
- **Node.js 18+** (for local development without Docker)
- **Python 3.11+** (for local development without Docker)

### Running with Docker (Recommended)

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/georgetown-traffic-ai.git
   cd georgetown-traffic-ai
   ```

2. **Set up environment variables**
   ```bash
   # Copy environment files
   cp .env.example .env
   cp frontend/.env.example frontend/.env
   cp backend/.env.example backend/.env
   cp python-ai/.env.example python-ai/.env
   
   # IMPORTANT: Update JWT_SECRET in backend/.env with a secure random string
   # Generate one with: openssl rand -base64 32
   ```

3. **Build and start all services**
   ```bash
   docker compose up --build
   ```

4. **Access the application**
   - **Frontend**: http://localhost:3000
   - **Backend API**: http://localhost:5000
   - **Python AI Service**: http://localhost:8000
   - **MongoDB**: localhost:27017
   - **Redis**: localhost:6379

5. **Create your first admin user**
   - Navigate to http://localhost:3000/register
   - Register with role: `admin`

### Local Development (Without Docker)

#### 1. Start MongoDB and Redis
```bash
# Install and start MongoDB
# Install and start Redis
```

#### 2. Frontend
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

#### 3. Backend
```bash
cd backend
npm install
cp .env.example .env
# Update .env with your MongoDB and Redis URLs
npm run dev
```

#### 4. Python AI Service
```bash
cd python-ai
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

## 🏗️ Architecture

The system follows a **microservices architecture**:

```
┌─────────────┐     ┌─────────────┐     ┌──────────────┐
│   Frontend  │────▶│   Backend   │────▶│  Python AI   │
│  (React)    │     │  (Express)  │     │  (FastAPI)   │
└─────────────┘     └─────────────┘     └──────────────┘
                           │                     │
                           ▼                     ▼
                    ┌─────────────┐      ┌──────────────┐
                    │   MongoDB   │      │     SUMO     │
                    └─────────────┘      │  Simulator   │
                           │             └──────────────┘
                           ▼
                    ┌─────────────┐
                    │    Redis    │
                    └─────────────┘
```

### Components

- **Frontend**: React.js with Vite, Recharts for visualization, Leaflet for maps
- **Backend**: Express.js API for user management, data persistence, and orchestration
- **Python AI Service**: FastAPI service for SUMO simulation, ML prediction, and RL training
- **MongoDB**: Primary database for all application data
- **Redis**: Job queue and caching

## ✨ Features

### Core Functionality
- ✅ User authentication with JWT and role-based access control (Admin, Researcher, Viewer)
- ✅ Georgetown road network visualization with OpenStreetMap integration
- ✅ SUMO traffic simulation with realistic vehicle types and demand profiles
- ✅ Machine learning traffic prediction (LSTM, Random Forest)
- ✅ Reinforcement learning signal control (DQN)
- ✅ Multi-agent RL (MARL) for network-wide coordination
- ✅ Real-time simulation monitoring via WebSocket
- ✅ Performance evaluation dashboard with interactive charts
- ✅ Scenario comparison and analysis
- ✅ Model management and versioning
- ✅ Research documentation and report generation

### User Roles
- **Admin**: Full system access, user management, system configuration
- **Researcher**: Run simulations, train models, access all research features
- **Viewer**: Read-only access to results and visualizations

## 📊 Technology Stack

### Frontend
- React 19.2.5
- React Router DOM 7.15.0
- Recharts 3.8.1 (charts)
- Leaflet.js 1.9.4 (maps)
- Socket.io-client 4.8.3 (WebSocket)
- Axios 1.16.0 (HTTP client)
- Vite 8.0.10 (build tool)

### Backend
- Node.js with Express.js
- MongoDB with Mongoose
- Redis with Bull (job queue)
- Socket.io (WebSocket)
- JWT for authentication
- Helmet (security)
- Winston (logging)

### Python AI Service
- FastAPI
- PyTorch (deep learning)
- TensorFlow/Keras (LSTM)
- Scikit-learn (Random Forest)
- SUMO (traffic simulation)
- OSMnx (OpenStreetMap)
- NetworkX (graph analysis)
- Pandas, NumPy (data processing)

## 📖 Documentation

- [Installation Guide](./INSTALLATION_GUIDE.md)
- [Quick Start Guide](./QUICK_START_GUIDE.md)
- [Docker Setup](./DOCKER_SETUP.md)
- [Frontend README](./frontend/README.md)
- [Backend README](./backend/README.md)
- [Python AI Service README](./python-ai/README.md)
- [API Documentation](./backend/src/README_PREDICTION_API.md)
- [Database Schema](./backend/DATABASE_SCHEMA.md)
- [Requirements Document](./.kiro/specs/georgetown-traffic-ai/requirements.md)
- [Design Document](./.kiro/specs/georgetown-traffic-ai/design.md)

## 🔒 Security

- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control (RBAC)
- Helmet.js for HTTP headers security
- CORS configuration
- Rate limiting (100 requests per 15 minutes)
- Input sanitization and validation
- XSS protection

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Python AI tests
cd python-ai
pytest

# Frontend tests
cd frontend
npm test
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

- **Your Name** - *Initial work* - Master's Thesis Research

## 🙏 Acknowledgments

- Georgetown traffic authorities for domain expertise
- SUMO development team for the traffic simulation platform
- OpenStreetMap contributors for map data
- Research supervisors and advisors

## 📧 Contact

For questions or support, please open an issue or contact [your.email@example.com](mailto:your.email@example.com)

## 🔗 Links

- [Live Demo](https://your-demo-url.com) (if available)
- [Research Paper](https://your-paper-url.com) (if published)
- [Project Documentation](https://your-docs-url.com)

---

**Note**: This is a research project for academic purposes. Results are based on simulation and require validation through pilot implementations before real-world deployment.
