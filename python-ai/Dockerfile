FROM python:3.11-slim

# Install SUMO from Debian repositories
RUN apt-get update && apt-get install -y \
    sumo \
    sumo-tools \
    sumo-doc \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set SUMO environment variables
ENV SUMO_HOME=/usr/share/sumo
ENV PATH="${SUMO_HOME}/bin:${PATH}"

WORKDIR /app

COPY requirements.txt .

# Install packages in smaller batches to avoid I/O errors
RUN pip install --no-cache-dir fastapi==0.104.1 uvicorn==0.24.0
RUN pip install --no-cache-dir pydantic==2.5.0 pydantic-settings==2.1.0
RUN pip install --no-cache-dir python-multipart==0.0.6 python-dotenv==1.0.0
RUN pip install --no-cache-dir sumolib==1.19.0 traci==1.19.0
RUN pip install --no-cache-dir pymongo==4.6.0 motor==3.3.2
RUN pip install --no-cache-dir requests==2.31.0 aiohttp==3.9.1
RUN pip install --no-cache-dir celery==5.3.4 redis==5.0.1
RUN pip install --no-cache-dir numpy pandas scikit-learn
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu
RUN pip install --no-cache-dir tensorflow
RUN pip install --no-cache-dir osmnx geopandas shapely googlemaps

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
