# Authentication and User Management System

This document describes the authentication and user management system implemented for the Georgetown Traffic AI platform.

## Features Implemented

### Backend (Node.js/Express)

#### 1. JWT-based Authentication System
- **Location**: `backend/src/utils/auth.js`
- Password hashing with bcrypt (10 rounds)
- JWT token generation (access and refresh tokens)
- Token verification and validation
- Secure token extraction from headers

#### 2. Authentication Endpoints
- **Location**: `backend/src/controllers/auth.controller.js`, `backend/src/routes/auth.routes.js`
- `POST /api/auth/register` - User registration with validation
- `POST /api/auth/login` - User login with credentials
- `POST /api/auth/refresh-token` - Refresh access token
- `GET /api/auth/me` - Get current user profile
- `POST /api/auth/logout` - Logout user

#### 3. Role-Based Access Control (RBAC)
- **Location**: `backend/src/middleware/auth.js`, `backend/src/config/roles.js`
- Three roles: Admin, Researcher, Viewer
- Comprehensive permission system
- Middleware for role and permission checking
- Route protection based on roles

#### 4. User Management Endpoints (Admin Only)
- **Location**: `backend/src/controllers/user.controller.js`, `backend/src/routes/user.routes.js`
- `GET /api/users` - List all users with search and filtering
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user information
- `PATCH /api/users/:id/role` - Update user role
- `PATCH /api/users/:id/status` - Toggle user active status
- `DELETE /api/users/:id` - Delete user

#### 5. Request Validation
- **Location**: `backend/src/validators/auth.validator.js`, `backend/src/validators/user.validator.js`
- Joi validation schemas for all endpoints
- Strong password requirements (min 8 chars, uppercase, lowercase, number)
- Email validation
- Input sanitization

### Frontend (React)

#### 1. Authentication Context
- **Location**: `frontend/src/contexts/AuthContext.jsx`
- Global authentication state management
- Automatic token refresh on 401 errors
- Axios interceptors for token management
- User registration and login functions

#### 2. Protected Routes
- **Location**: `frontend/src/components/ProtectedRoute.jsx`
- Route protection based on authentication
- Role-based route access control
- Automatic redirect to login for unauthenticated users

#### 3. Authentication Pages
- **Location**: `frontend/src/pages/LoginPage.jsx`, `frontend/src/pages/RegisterPage.jsx`
- Login page with form validation
- Registration page with comprehensive validation
- Error handling and display
- Responsive design

#### 4. Dashboard
- **Location**: `frontend/src/pages/DashboardPage.jsx`
- User profile display
- Role-based content
- Admin action links
- Logout functionality

#### 5. User Management Interface (Admin Only)
- **Location**: `frontend/src/pages/UserManagementPage.jsx`
- User list with search and filtering
- Edit user information
- Change user roles
- Activate/deactivate users
- Delete users
- Modal-based editing

## Role Permissions

### Admin
- Full system access
- User management (create, read, update, delete)
- Role management
- System configuration
- All researcher and viewer permissions

### Researcher
- Simulation management
- Model training and deployment
- Data upload and management
- Analytics and reporting
- Read-only user profile access

### Viewer
- Read-only access to:
  - Simulations
  - Models
  - Data
  - Analytics
  - Reports

## Security Features

1. **Password Security**
   - Bcrypt hashing with 10 rounds
   - Strong password requirements
   - Password not returned in API responses

2. **Token Security**
   - JWT with expiration (7 days for access, 30 days for refresh)
   - Refresh token rotation
   - Token type validation (access vs refresh)

3. **API Security**
   - CORS configuration
   - Helmet.js security headers
   - Rate limiting
   - Input validation and sanitization
   - XSS protection

4. **Authorization**
   - Role-based access control
   - Permission-based middleware
   - Protected routes
   - Self-modification prevention (users can't change their own role or delete themselves)

## Environment Variables

Required environment variables in `backend/.env`:

```
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRE=7d
JWT_REFRESH_EXPIRE=30d
```

Required environment variables in `frontend/.env`:

```
VITE_API_URL=http://localhost:5000/api
```

## Usage Examples

### Backend API Usage

```javascript
// Register a new user
POST /api/auth/register
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "firstName": "John",
  "lastName": "Doe",
  "organization": "University of Guyana"
}

// Login
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "SecurePass123"
}

// Access protected route
GET /api/auth/me
Headers: {
  "Authorization": "Bearer <access_token>"
}

// Admin: Update user role
PATCH /api/users/:id/role
Headers: {
  "Authorization": "Bearer <admin_access_token>"
}
{
  "role": "researcher"
}
```

### Frontend Usage

```javascript
// Using the auth context
import { useAuth } from '../contexts/AuthContext';

function MyComponent() {
  const { user, login, logout, isAuthenticated, isAdmin } = useAuth();

  // Check if user is authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  // Check user role
  if (isAdmin) {
    // Show admin features
  }
}

// Protected route
<Route
  path="/admin/users"
  element={
    <ProtectedRoute requiredRole="admin">
      <UserManagementPage />
    </ProtectedRoute>
  }
/>
```

## Testing

To test the authentication system:

1. Start the backend server:
   ```bash
   cd backend
   npm run dev
   ```

2. Start the frontend:
   ```bash
   cd frontend
   npm run dev
   ```

3. Register a new user at `http://localhost:3000/register`

4. Login at `http://localhost:3000/login`

5. Access the dashboard at `http://localhost:3000/dashboard`

6. For admin features, manually update a user's role to 'admin' in MongoDB, then access `http://localhost:3000/admin/users`

## Next Steps

The authentication system is now complete and ready for integration with other system components. Future tasks will build upon this foundation to implement:

- Simulation management
- Traffic prediction models
- Reinforcement learning agents
- Analytics and reporting
