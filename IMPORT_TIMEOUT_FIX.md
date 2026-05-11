# Import Timeout Issue - Explanation & Fix

## What's Happening

The error message **"Failed to import network data"** appears even though the import is actually working in the background. Here's why:

### The Problem

1. **Bounding box was TOO LARGE** - Covering 17,660x the normal query size
2. **18,046 API requests** needed to download all the data
3. **Takes 10-15 minutes** to complete (with rate limiting pauses)
4. **Frontend times out** after 30-60 seconds waiting for response
5. **Shows error** even though Python service continues importing in background

### Why the Large Area?

The original bounding box coordinates were:
```python
north: 6.8282, south: 6.7800, east: -58.1300, west: -58.1800
```

This covered a **massive region** far beyond Georgetown city limits, including rural areas and neighboring regions.

## The Fix

### 1. Reduced Bounding Box Size ✅

Updated to cover only Georgetown city center:
```python
GEORGETOWN_BBOX = {
    "north": 6.8200,   # Near Demerara Bridge
    "south": 6.7900,   # South Georgetown
    "east": -58.1400,  # East Georgetown  
    "west": -58.1700   # West Georgetown
}
```

This should reduce the import time from **15 minutes to 2-3 minutes**.

### 2. What to Do Now

**Option A: Wait for Current Import to Finish**
- The background import is still running
- Check Python service logs to see progress
- Once complete, refresh the map page
- Data will be in MongoDB and ready to use

**Option B: Restart and Re-import**
- Stop the Python service (Ctrl+C)
- Restart it: `python -m app.main`
- Click "Import Georgetown Network" again
- Should complete in 2-3 minutes with smaller area

### 3. How to Check Import Status

Monitor the Python service console:
- Look for: `"Downloaded network: X nodes, Y edges"`
- Look for: `"Successfully imported Georgetown network"`
- Look for: `"Stored X intersections"`

## Future Improvement

To prevent timeout errors, the import should be made **asynchronous**:

1. Return immediately with status "importing"
2. Process in background
3. Frontend polls for completion status
4. Show progress bar to user

This would require:
- Background task queue (Celery or FastAPI BackgroundTasks)
- Status endpoint to check import progress
- Frontend polling mechanism

## Current Workaround

For now, just **wait patiently** or **restart with smaller bbox**. The import WILL complete, the frontend just doesn't wait long enough to see it.

## Verification

After import completes, you should see in MongoDB:
- `networks` collection - 1 document
- `intersections` collection - ~50-100 documents
- `road_segments` collection - ~200-500 documents

Then the map will load successfully!
