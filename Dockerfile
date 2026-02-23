# Stage 1: Build React frontend
FROM node:20-alpine AS frontend-build

WORKDIR /build

COPY apps/pairledger/frontend/package*.json ./
RUN npm install

COPY apps/pairledger/frontend/ ./
RUN npm run build


# Stage 2: Python runtime
FROM python:3.12-slim

# Install tini for proper PID 1 signal handling
RUN apt-get update && apt-get install -y --no-install-recommends tini curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN addgroup --system app && adduser --system --ingroup app app

WORKDIR /app

RUN pip install --no-cache-dir --upgrade pip

# Install shared auth middleware
COPY platform/shared/auth-middleware-python /tmp/auth-middleware
RUN pip install --no-cache-dir /tmp/auth-middleware && rm -rf /tmp/auth-middleware

# Install app dependencies
COPY apps/pairledger/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app code
COPY --chown=app:app apps/pairledger/pairledger_api/ ./pairledger_api/
COPY --chown=app:app apps/pairledger/alembic/ ./alembic/
COPY --chown=app:app apps/pairledger/alembic.ini .

# Copy built frontend from stage 1
COPY --from=frontend-build --chown=app:app /static ./static/

# Ensure data dir is writable by app user
RUN mkdir -p /data && chown app:app /data

USER app

EXPOSE 3002

ENTRYPOINT ["tini", "--"]
CMD ["uvicorn", "pairledger_api.main:app", "--host", "0.0.0.0", "--port", "3002"]
