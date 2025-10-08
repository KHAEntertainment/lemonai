# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

- Audience: future Warp instances operating in this repo
- Goal: provide concise, non-generic instructions for building, running, testing, and understanding the architecture so Warp can be productive quickly

Overview
- Full-stack agentic AI framework
- Backend: Node.js (Koa) API server with SQLite (via Sequelize) and Swagger UI
- Frontend: Vue 3 + Vite SPA in frontend/
- Runtime sandbox: Docker-based execution environment for safe code runs; optional local mode
- Browser automation service: Python FastAPI service using browser-use
- Agent system: planning, tools, reflection, memory; MCP integration

Common commands
Backend (Node.js)
- Install deps: npm install
- Dev server (auto-reload): npm run dev
- Start (prod-like): npm run start
- Initialize DB schema and seed defaults: node src/models/sync.js
- Run all tests: npm test
- Run a single test file: npx mocha test/api/platform/platform.test.js
- Run tests matching a name: npx mocha "test/**/*.test.js" --grep "Platform Routes"

Frontend (Vue 3 + Vite)
- Install deps: (from frontend/) npm install
- Dev server: (from frontend/) npm run dev
- Build: (from frontend/) npm run build
- Preview built app: (from frontend/) npm run preview

Makefile shortcuts (root)
- Initialize project (backend+frontend deps + DB): make init
- Start both backend and frontend (runs init-tables and launches both): make run
- Start backend only: make start-backend
- Start frontend only: make start-frontend
- Build/push runtime sandbox image: make build-runtime-sandbox
- Build/push app image: make build-app

Docker (compose)
- Run via compose (app image): docker compose up
  - Service: lemon (hexdolemonai/lemon:latest)
  - Exposes: 5005 (mapped to app)
  - Volumes: Docker socket, ~/.cache, workspace and data directories

Python browser automation server
- Python >= 3.11
- Install deps (from browser_server/):
  - python -m venv .venv && source .venv/bin/activate
  - pip install -r requirements.txt
- Run server:
  - python browser_use/server.py
  - Default host/port from browser_use/config/config.yaml (0.0.0.0:9000)

Environment
Root .env.example contains key toggles
- STORAGE_PATH: SQLite DB file path (default data/database.sqlite)
- WORKSPACE_DIR: conversation work dir base (default workspace)
- RUNTIME_TYPE: local-docker or other runtime modes (default local-docker)
- ENABLE_KNOWLEDGE: ON/OFF for knowledge feedback pipeline

Frontend env (frontend/.env.example)
- VITE_SERVICE_URL: backend base URL (default http://127.0.0.1:3000)
- VITE_PORT: Vite dev server port (default 5005)

Containerized run (README)
- Pull runtime image: docker pull hexdolemonai/lemon-runtime-sandbox:latest
- Run app image with runtime: docker run ... hexdolemonai/lemon:latest make run
- For cloud deployments, set VITE_ALLOWED_HOSTS (comma-separated domains)

Architecture and structure
High-level
- Frontend (frontend/): Vue 3 SPA using Vite; talks to backend via VITE_SERVICE_URL; dev server serves on VITE_PORT
- Backend (src/): Koa app exposing /api/* endpoints, serves static public/, and hosts Swagger (GET /swagger -> UI, /swagger.json -> spec)
- Data: SQLite via Sequelize (src/models). DB file path resolved via utils/electron.getFilepath to data/database.sqlite by default
- Agent system (src/agent): planning, tools, memory, prompt templates, SSE streaming; integrates with runtime and MCP
- Runtime (src/runtime): executes actions either locally or in Docker-based sandbox; mounts per-conversation workspace directories; provides terminal_run, write_code, read_file actions; Docker variant can delegate to an execution server container
- Tools (src/tools): concrete tool implementations (e.g., web search, terminal_run, read/write files), plus MCP tool wiring
- Browser automation (browser_server/): separate FastAPI service (browser-use) for web actions and scraping when the agent triggers browser tool paths

Backend layout highlights
- Entry: bin/www starts HTTP server using Koa app from src/app.js (default PORT=3000)
- Middlewares: koa-body (multipart), koa-json, logger, auth (middlewares/auth), setGlobalToken, wrap.context; static serving from public/
- Swagger: src/swagger/swagger.js collects annotated routers in src/routers/*/*.js and exposes /swagger.json; UI at /swagger
- Routers (src/routers):
  - index.js aggregates module routers with router.use(require("./<module>/index.js"))
  - agent/ (prefix /api/agent): run (intent-based execution; SSE streaming), chat, coding (single-shot and SSE), proxy, utils
  - Additional modules: conversation, file, platform, model, default_model_setting, search_provider_setting, runtime, message, user, version, mcp_server, knowledge, agent_store, conversation_case, order, points_transaction, payment, membership_plan, recharge_product
- Models (src/models): Sequelize models for Conversation, Message, Platform, Model, etc.; sync.js creates/alters tables and seeds default platforms/search providers/users

Agent system
- Entry paths: POST /api/agent/run for auto/agent/chat/twins modes; POST /api/agent/coding/sse for coding sessions; POST /api/agent/chat for chat
- Streamed output: SSE uses special markers like __lemon_mode__ and __lemon_out_end__ with message IDs; messages persisted to SQLite
- Memory/knowledge: ENABLE_KNOWLEDGE toggles feedback processing; knowledge count tracked per Agent
- Runtime selection via RUNTIME_TYPE; conversation workspace: user-specific directory with Conversation_<idPrefix>

Runtime and sandbox
- LocalRuntime: executes actions on host with path restrictions; supports write_code, terminal_run, read_file, and other tools; records messages to DB and streams deltas
- DockerRuntime.local: manages a local container (hexdolemonai/lemon-runtime-sandbox:latest), picks available host ports, mounts workspace, and proxies execute_action to the sandbox’s action server
- DockerRuntime: remote/ECI variant that interacts with a remote container orchestration service
- Environment affecting Docker runtime:
  - DOCKER_HOST_ADDR: host gateway for container communication
  - ACTUAL_HOST_WORKSPACE_PATH: maps a host path into container workspace

Testing
- Framework: Mocha + Chai + supertest + sinon
- Script: npm test (runs mocha ./test/**/*.test.js)
- Example single test file: npx mocha test/api/platform/platform.test.js
- Example by grep: npx mocha "test/**/*.test.js" --grep "should create a platform"

Swagger
- Visit /swagger for UI; /swagger.json serves spec generated from JSDoc annotations on router files

CI/docker images (GitHub Actions)
- .github/workflows/app_docker_build_push.yml builds and pushes:
  - Runtime sandbox image: hexdolemonai/lemon-runtime-sandbox
  - App image: hexdolemonai/lemon
  - Triggered by changes to containers/*/VERSION files

Quick start (local dev)
1) Backend
- cp .env.example .env (optional; defaults work for local dev)
- npm install
- node src/models/sync.js (initialize tables and seed defaults)
- npm run dev (Koa on :3000)

2) Frontend
- cd frontend && npm install
- npm run dev (Vite on VITE_PORT; default 5005)
- Ensure VITE_SERVICE_URL points to backend (default http://127.0.0.1:3000)

3) Optional: Python browser server
- cd browser_server && python -m venv .venv && source .venv/bin/activate
- pip install -r requirements.txt
- python browser_use/server.py (serves on 0.0.0.0:9000 per config)

4) Makefile alternative
- make init; make run (initializes DB and starts both backend and frontend)

Notes and cautions
- Linting: no explicit linter configured at root; frontend also does not define lint scripts; run formatters/tools if added in the future
- SQLite file lives under data/ by default; ensure the directory is writable
- When using Docker runtime locally, the sandbox image will be pulled automatically if missing; ensure Docker Desktop is running and the daemon is accessible
- Frontend env values (frontend/.env.production, .env.example) control connectivity and UI flags (e.g., VITE_IS_CLIENT)
- Swagger spec title is currently set to chataa; adjust if necessary for external documentation

Cross-references
- Root: README.md for product overview, Docker quick run, cloud notes, and community links
- Frontend: frontend/README.md for additional Vue-related notes
- GitHub Actions: .github/workflows/* for image build/push logic
- Swagger: src/swagger/swagger.js; router annotations in src/routers/*/*.js
- Models and DB seeding: src/models/sync.js
- Runtime: src/runtime/* (LocalRuntime.js, DockerRuntime.local.js, DockerRuntime.js)
- Agent flows: src/routers/agent/*, src/agent/*
- Python browser service: browser_server/browser_use/*