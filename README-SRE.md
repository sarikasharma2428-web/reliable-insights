# SRE Observability Platform

A comprehensive real-time observability platform for Site Reliability Engineering, featuring metrics collection, log aggregation, incident management, and automated alerting.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                            │
│              Lovable Cloud / Standalone Deployment                  │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
┌─────────────────┐ ┌───────────┐ ┌─────────────────┐
│ Supabase/Cloud  │ │  FastAPI  │ │    Grafana      │
│   (Database)    │ │  Backend  │ │  (Dashboards)   │
└─────────────────┘ └─────┬─────┘ └────────┬────────┘
                          │                │
          ┌───────────────┼────────────────┼───────────────┐
          ▼               ▼                ▼               ▼
   ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐
   │ PostgreSQL │  │ Prometheus │  │    Loki    │  │    OTel    │
   │    (DB)    │  │  (Metrics) │  │   (Logs)   │  │ Collector  │
   └────────────┘  └────────────┘  └────────────┘  └────────────┘
```

## 🚀 Quick Start

### Option 1: Full Stack with Docker (Recommended)

```bash
# Clone the repository
git clone <your-repo>
cd sre-observability-platform

# Start all services
docker-compose up -d

# Access the services:
# - Frontend: http://localhost:5173
# - Backend API: http://localhost:8000
# - Grafana: http://localhost:3000 (admin/admin)
# - Prometheus: http://localhost:9090
# - Loki: http://localhost:3100
```

### Option 2: Frontend Only (Lovable Cloud)

The frontend works standalone with Lovable Cloud (Supabase backend). Simply:

1. Open the project in Lovable
2. The Supabase backend is automatically connected
3. Real-time updates work via Supabase Realtime

## 📁 Folder Structure

```
sre-observability-platform/
│
├── backend/                    # FastAPI Backend
│   ├── main.py                 # Entrypoint
│   ├── api/                    # HTTP API endpoints
│   ├── monitoring/             # Prometheus, Loki, SLI/SLO
│   ├── incidents/              # Auto-detection & lifecycle
│   ├── alerts/                 # Rules & evaluation
│   ├── auth/                   # API key auth
│   ├── db/                     # Database layer
│   └── utils/                  # Config, logging
│
├── observability/              # Observability Stack
│   ├── prometheus/             # Prometheus config & rules
│   ├── loki/                   # Loki & Promtail config
│   └── otel/                   # OpenTelemetry Collector
│
├── grafana/                    # Grafana Setup
│   ├── provisioning/           # Datasources & dashboard config
│   └── dashboards/             # Pre-built dashboards
│
├── docker/                     # Dockerfiles
│
├── src/                        # React Frontend
│   ├── components/sre/         # SRE-specific components
│   ├── hooks/                  # Data fetching hooks
│   ├── pages/                  # Page components
│   └── lib/                    # Utilities & API client
│
├── docker-compose.yml          # Full stack orchestration
├── requirements.txt            # Python dependencies
└── .env.example                # Environment template
```

## ⚙️ Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Backend
DATABASE_URL=postgresql://postgres:postgres@db:5432/sre_platform
PROMETHEUS_URL=http://prometheus:9090
LOKI_URL=http://loki:3100

# Frontend (optional - for backend connection)
VITE_BACKEND_URL=http://localhost:8000
```

## 📊 Features

### Golden Signals Monitoring
- **Latency**: P50, P95, P99 percentiles
- **Traffic**: Requests per second
- **Errors**: Error rate percentage
- **Saturation**: CPU, Memory, Disk usage

### Service Health
- Real-time service status tracking
- Automatic health checks
- Status: healthy, degraded, critical, unknown

### Incident Management
- Auto-detection from threshold breaches
- Incident lifecycle: Open → Acknowledged → Investigating → Resolved
- Timeline and event tracking
- Metrics & logs correlation

### Alerting
- Configurable alert rules
- Severity levels: critical, warning, info
- Alert silencing
- Multi-channel notifications (future: Slack, PagerDuty)

### SLO Tracking
- Error budget monitoring
- Burn rate alerting
- Compliance reporting

## 🔌 API Endpoints

### Health
- `GET /health` - Basic health check
- `GET /health/detailed` - Full system health

### Services
- `GET /api/v1/services` - List services
- `POST /api/v1/services` - Onboard service
- `GET /api/v1/services/{id}` - Get service
- `POST /api/v1/services/{id}/health-check` - Trigger health check

### Metrics
- `GET /api/v1/metrics` - List metrics
- `GET /api/v1/metrics/golden-signals/{service_id}` - Golden signals
- `GET /api/v1/metrics/prometheus/query` - PromQL query
- `GET /api/v1/metrics/sli/{service_id}` - Calculate SLI

### Logs
- `GET /api/v1/logs` - List logs
- `GET /api/v1/logs/loki/query` - LogQL query
- `WS /api/v1/logs/stream` - Real-time log streaming

### Incidents
- `GET /api/v1/incidents` - List incidents
- `POST /api/v1/incidents` - Create incident
- `POST /api/v1/incidents/{id}/acknowledge` - Acknowledge
- `POST /api/v1/incidents/{id}/resolve` - Resolve
- `GET /api/v1/incidents/{id}/correlate` - Get correlation

### Alerts
- `GET /api/v1/alerts` - List alerts
- `POST /api/v1/alerts/{id}/acknowledge` - Acknowledge
- `POST /api/v1/alerts/{id}/silence` - Silence
- `GET /api/v1/alert-rules` - List rules

## 🔍 Grafana Dashboards

Pre-configured dashboards:
- **System Overview**: Service health, active incidents
- **Metrics**: CPU, memory, latency, error rates
- **Logs**: Log explorer with filtering
- **Incidents**: Timeline and MTTR metrics

Access at `http://localhost:3000` (default: admin/admin)

## 🛠️ Development

### Backend Development

```bash
cd backend
pip install -r ../requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend Development

```bash
npm install
npm run dev
```

### Running Tests

```bash
# Backend tests (when implemented)
pytest

# Frontend tests (when implemented)
npm test
```

## 📡 Real-time Features

The platform supports real-time updates via:

1. **Supabase Realtime** (default for Lovable Cloud)
   - Automatic database change notifications
   - No additional setup required

2. **WebSocket Streaming** (backend mode)
   - Live log streaming from Loki
   - Real-time metric updates

## 🔒 Security

- API key authentication for backend
- Tenant isolation middleware
- Row Level Security (RLS) on all tables
- Secure credential storage via Supabase secrets

## 📈 Scaling

- Prometheus for time-series metrics
- Loki for log aggregation
- PostgreSQL for persistent storage
- Edge functions for serverless scaling

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License
