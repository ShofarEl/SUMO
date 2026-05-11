@echo off
echo ========================================
echo Georgetown Traffic AI - Frontend Setup
echo ========================================
echo.

echo Step 1: Installing Tailwind CSS...
cd frontend
call npm install -D tailwindcss postcss autoprefixer
call npm install @headlessui/react @heroicons/react
call npx tailwindcss init -p

echo.
echo Step 2: Copying data files...
cd ..
if not exist "backend\data\georgetown" mkdir backend\data\georgetown
copy colab\*.json backend\data\georgetown\
copy colab\*.geojson backend\data\georgetown\

echo.
echo Step 3: Importing data into MongoDB...
cd backend
call node scripts\import_georgetown_data.js

echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Update frontend/tailwind.config.js (see COMPLETE_FRONTEND_BACKEND_INTEGRATION.md)
echo 2. Update frontend/src/index.css (see guide)
echo 3. Create frontend/src/pages/ResultsDashboard.jsx (see guide)
echo 4. Add route to App.jsx
echo 5. Start backend: cd backend ^&^& npm start
echo 6. Start frontend: cd frontend ^&^& npm run dev
echo 7. Open http://localhost:3000/results
echo.
pause
