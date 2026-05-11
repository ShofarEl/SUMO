# 🚀 Start MongoDB

## The Error

```
MongooseServerSelectionError: connect ECONNREFUSED ::1:27017
```

**This means MongoDB is not running!**

---

## ✅ Start MongoDB (Choose One Option)

### Option 1: Using Docker (Recommended)

```bash
docker-compose up -d mongodb
```

### Option 2: Using Local MongoDB

If you have MongoDB installed locally:

```bash
# Start MongoDB service
net start MongoDB
```

Or if that doesn't work:

```bash
# Start mongod directly
mongod
```

### Option 3: Check if MongoDB is Already Running

```bash
# Check if MongoDB process is running
tasklist | findstr mongod
```

---

## 🔄 Then Run Import Again

Once MongoDB is running:

```bash
cd backend
node scripts\import_georgetown_data.js
```

---

## 🎯 Full Startup Sequence

Here's the complete order to start everything:

### Terminal 1: MongoDB
```bash
docker-compose up -d mongodb
# OR
net start MongoDB
```

### Terminal 2: Backend
```bash
cd backend
npm start
```

### Terminal 3: Frontend
```bash
cd frontend
npm run dev
```

### Terminal 4: Import Data (One Time)
```bash
cd backend
node scripts\import_georgetown_data.js
```

---

## ✅ Verify MongoDB is Running

```bash
# Check MongoDB connection
mongo --eval "db.version()"
```

Or visit: http://localhost:27017

You should see: "It looks like you are trying to access MongoDB over HTTP on the native driver port."

---

**Start MongoDB first, then run the import script!** 🚀
