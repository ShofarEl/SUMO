# Georgetown Traffic AI - Backend

Node.js/Express backend API for the Georgetown Traffic AI Management System.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Update `.env` with your configuration

4. Start development server:
```bash
npm run dev
```

## API Documentation

API documentation will be available at `/api/docs` when the server is running.

## Project Structure

```
backend/
├── src/
│   ├── config/         # Configuration files
│   ├── controllers/    # Route controllers
│   ├── middleware/     # Express middleware
│   ├── models/         # Mongoose models
│   ├── routes/         # API routes
│   ├── services/       # Business logic
│   ├── utils/          # Utility functions
│   └── server.js       # Entry point
├── tests/              # Test files
└── package.json
```
