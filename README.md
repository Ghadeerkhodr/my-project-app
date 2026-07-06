# DevOps Guided Project
# 🚀 Enterprise Multi-Tier Web Architecture on Docker
### Production-Ready Environment with Automation, Micro-Segmentation, High Availability, and Observability Stack.

---

## 📌 Introduction & Project Goal
The core objective of this project is to architect and deploy a fully containerized, secure, and production-grade Web Application infrastructure using **Docker** and **Docker Compose**. 

Moving away from loose configurations, this architecture implements **Zero-Trust network isolation (micro-segmentation)**, guaranteed **Data Persistence**, fine-grained **Resource Constraints (Limits)** to prevent noisy-neighbor syndromes, strict **Fault-Tolerance (Restart Policies)**, and a modern **Observability Stack (Prometheus, Grafana, cAdvisor)** capable of handling and monitoring microservices under heavy load.

---

## 🎯 Task Requirements (Scope of Work)
1. **Network Isolation:** Create distinct internal networks to isolate data layers from edge traffic.
2. **Stateful Data Persistence:** Deploy a reliable relational database on persistent Docker volumes.
3. **Multi-Tier Microservices:** Run a separate Backend API and an independent Frontend web server.
4. **Edge Security & Routing (Reverse Proxy):** Deploy an Nginx Layer-7 proxy acting as the sole entry point, handling SSL termination.
5. **Fault Tolerance & Chaos Engineering:** Implement strategic container restart behaviors and simulate failures.
6. **Resource Optimization:** Impose CPU and Memory bounds with engineering justifications.
7. **Production Logging:** Setup Log-rotation to protect host storage from disk exhaustion.
8. **Live Observability:** Collect container, application, and database metrics into centralized dashboards.

---

## 🏗️ System Architecture & Data Flow

```text
               [ Public Traffic: Ports 80 / 443 ]
                                │
                                ▼
                       ┌─────────────────┐
                       │   Nginx Proxy   │
                       └────────┬────────┘
                                │
        ┌───────────────────────┴───────────────────────┐
        ▼ (frontend-net)                                ▼ (frontend-net)
┌───────────────┐                               ┌───────────────┐
│   Frontend    │                               │  Backend API  │
└───────────────┘                               └───────┬───────┘
                                                        │
                                                        ▼ (backend-net)
                                                ┌─────────────────┐
                                                │   PostgreSQL    │
                                                └─────────────────┘
                                                        ▲
  ┌─────────────────────────────────────────────────────┤ (Scrape Metrics)
  │                                                     │
┌─┴─────────────┐                               ┌───────┴───────┐
│    Grafana    │ ◄──────────(Read)──────────── │  Prometheus   │
└───────────────┘                               └───────▲───────┘
                                                        │
                                                        │ (Scrape Metrics)
                                                ┌───────┴───────┐
                                                │   cAdvisor    │
                                                └─────────────────┘

```

## 📁 Project Directory Structure
```text
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── Dockerfile
│   └── index.html
├── nginx/
│   ├── conf/
│   ├── conf.d/
│   │   └── default.conf
│   └── nginx.conf
├── prometheus/
│   └── prometheus.yml
├── certbot/
│   └── cloudflare.ini
├── docker-compose.yml
└── README.md

```
---
## 🛠️ Deep Dive: Production Configurations & Justifications
### 1. Network Micro-Segmentation
frontend-net: Bridges the Reverse Proxy, Frontend, and Backend API.

backend-net: Strictly confines the Database (db) and the Monitoring tools (cAdvisor, Prometheus, Grafana).

Security Benefit: The Database has zero horizontal exposure to the outer edge or the Frontend container, effectively eliminating direct external SQL injection/attack vectors.

### 2. Resource Management Matrix (CPU & Memory Limits)

| Service | CPU Limit | RAM Limit | Engineering Justification |
| :--- | :--- | :--- | :--- |
| `db` | `0.50` (50%) | `256M` | Prevents rogue/unindexed queries from locking host CPUs while allowing database internal caching. |
| `backend` | `0.50` (50%) | `256M` | Standard capacity allocation for stateless code execution runtimes. |
| `frontend` | `0.25` (25%) | `128M` | Extremely light weight; merely serves static compilation assets. |
| `proxy` | Uncapped | Managed | Handled as a critical entry gate; requires elasticity during spikes. |
| `prometheus`| `0.50` (50%) | `512M` | **Heaviest Service.** Requires larger memory limits to hold Time-Series Data chunks in-memory (`TSDB`) before flushing to disk. Preventing `OOMKilled` errors. |
| `grafana` | `0.25` (25%) | `256M` | Sufficient for querying data sources and rendering visualization dashboard panels concurrently. |


### 3. Fault-Tolerance & Auto-Healing (Restart Policies)

We implement distinct Docker restart policies based on the criticality and behavior of each service. This ensures high availability while protecting the host machine from faulty recursive crash loops.

| Service        | Restart Policy         | Rationale |
| :------------- | :--------------------- | :-------- |
| **proxy**      | `always`               | **The singular gateway into our network.** If it exits for any reason, it must instantly bounce back to preserve system availability. |
| **backend**    | `on-failure:3`         | **Protects the host system against recursive crash loops (CrashLoopBackOff).** If there is a missing environmental variable or a deep code error, spinning infinitely consumes CPU. Limiting to 3 tries surfaces faults effectively. |
| **db & Monitoring** | `unless-stopped` | **Perfect for infrastructure components.** If stopped intentionally by an engineer for migrations/maintenance, it remains dormant. If the host machine reboots or crashes, Docker safely fires them back up automatically. |

#### Service Breakdown

##### 🚪 Proxy (`restart: always`)
- **Image**: Nginx (or Traefik/HAProxy)
- **Behavior**: Immediate recovery from any panic or OOM killer event.
- **Impact**: Zero tolerance for downtime; the entry point must always be responsive.

##### ⚙️ Backend (`restart: on-failure:3`)
- **Image**: Custom application logic
- **Behavior**: Restarts only if the exit code is non-zero, but stops after 3 consecutive failures.
- **Impact**: Prevents a buggy deployment from thrashing the CPU and filling logs with stack traces, allowing easy identification of persistent errors.

##### 🗄️ Database & Monitoring (`restart: unless-stopped`)
- **Services**: PostgreSQL, Prometheus, Grafana
- **Behavior**: Remains stopped if the admin manually executes `docker stop`. Automatically restarts on daemon restart or host reboot.
- **Impact**: Engineers can safely perform database migrations or update Grafana dashboards without Docker automatically interfering.

---

### 4. Storage Sustainability (Log Drivers & Volumes)

To combat **infinite log generation** which leads to unexpected disk capacity failures in production, we enforce strict log rotation and map all critical state to persistent volumes.

###$ 4.1 Logging Configuration

We utilize the default `json-file` driver with rigorous retention caps defined globally via a YAML anchor:

```yaml
x-logging: &default-logging
  driver: "json-file"
  options:
    max-size: "10m"   # Maximum singular file size before rotation
    max-file: "3"     # Retain up to 3 old rolled files, purging older ones
```

## Auther
[Ghadeer.Alkhodr](www.linkedin.com/in/ghadeer-alkhodr)
