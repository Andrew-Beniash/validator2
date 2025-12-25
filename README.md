# Validator Monorepo – Problem Discovery & Validation Platform

A full‑stack application that guides users through a structured **problem discovery and validation** workflow, analyzes their problem using multiple methodologies with LLMs, and delivers a synthesized PDF report via email.

---

## Project Overview

The platform helps founders and product teams:

- Capture a clear description of a problem they want to validate.
- Add clarification context (location, target customers, team size).
- Configure an AI provider (OpenAI or Claude) and model per session.
- Run the problem through five analysis frameworks:
  - Jobs‑to‑be‑Done (JTBD)
  - Design Thinking – Define
  - Lean Canvas – Problem section
  - Root Cause Analysis
  - Opportunity Solution Tree (OST)
- Execute these methods sequentially via LLM APIs.
- Generate:
  - Per‑method `.txt` files.
  - A synthesized **Problem Validation Summary Report** as a PDF.
- Optionally email the PDF + TXT files to the configured address.

The app is designed for **short‑lived sessions**, never storing API keys on the server, and using a temp directory plus TTL cleanup for generated artifacts.

---

## High‑Level Architecture

- **Frontend** (`packages/frontend`)
  - React 18 + Vite.
  - Multi‑step wizard with:
    - Page 1 – Describe Your Problem.
    - Page 2 – Clarification form.
    - Page 3 – Email & AI Configuration.
    - Page 4 – Processing / progress view.
    - Page 5 – Completion / results screen.
  - `react-hook-form` for form state and validation.
  - `FormWizardProvider` for:
    - Managing multi‑step form data.
    - Loading/saving data via `/api/session`.
  - Uses `fetch` with `credentials: 'include'` to talk to the backend via `/api/*`.

- **Backend** (`packages/backend`)
  - Node.js / Express (ESM).
  - In‑memory `SessionStore` with TTL and cleanup.
  - Session middleware with cookie support (`validator_session_id`).
  - Core services:
    - `llmService` – provider‑agnostic LLM calls (OpenAI / Claude).
    - `promptTemplates` – five methodology prompts and prompt builder.
    - `analysisExecutor` – sequential execution engine for all methods.
    - `fileOutputService` – per‑method `.txt` exports.
    - `synthesisService` + `synthesisTemplates` – builds synthesis prompt and summary.
    - `pdfReportService` – generates the styled summary PDF.
    - `emailService` – sends PDF + TXT attachments via SMTP (Nodemailer).
    - `fileCleanupService` – periodic cleanup of temp files based on TTL.

---

## Backend API Overview

All endpoints are under `/api` and use the session cookie for continuity:

- **Session**
  - `GET /api/session` – Get current session (if any).
  - `PUT /api/session` – Update current session (used by form wizard).

- **Analysis lifecycle**
  - `POST /api/analysis/init`  
    Initialize analysis state from combined form payload (problem, clarification, config).
  - `POST /api/analysis/run`  
    Run all five methodologies sequentially. Requires `apiKey` in body; never stored in session.
  - `GET /api/analysis/status`  
    Returns status, current step, progress, and per‑step `hasResult` flags.
  - `POST /api/analysis/synthesize`  
    After analysis completes, calls LLM again to synthesize a summary and writes the PDF.
  - `GET /api/analysis/report`  
    Streams the final PDF report for download.
  - `POST /api/analysis/email`  
    Sends the PDF + per‑method TXT files to the configured email.

See `packages/backend/ANALYSIS_API.md` for detailed request/response shapes.

---

## Frontend User Flow

1. **Describe Your Problem (Page 1)**
   - User enters a 500–2000 character problem description.
   - Live character count and validation.
   - Saved to session via `PUT /api/session`.

2. **Clarification Form (Page 2)**
   - Captures location, target customer, and team size.
   - Saved to session for inclusion in analysis context.

3. **Configure Email & AI Provider (Page 3)**
   - User provides:
     - Notification email.
     - Provider (OpenAI or Claude).
     - Model.
     - API key (kept only in memory on the client).
   - On submit:
     - Saves config (minus API key) to session.
     - Calls `/api/analysis/init`.
     - Calls `/api/analysis/run` with `{ apiKey }` in the body.
     - Navigates to `/processing`.

4. **Processing / Progress View (Page 4)**
   - Polls `/api/analysis/status` every ~1–1.5 seconds.
   - Displays:
     - Overall progress bar.
     - “Step X of 5 – [Method Name]”.
     - Per‑method status indicators.
   - On completion: navigates to `/results`.

5. **Results / Completion (Page 5)**
   - Confirms analysis completion.
   - Lazily calls `/api/analysis/synthesize` (with the in‑memory API key) to:
     - Generate the synthesis summary.
     - Produce the styled PDF report.
   - Allows user to:
     - Download the PDF (`GET /api/analysis/report`).
     - Trigger email delivery (`POST /api/analysis/email`).
     - Start a new analysis.

---

## Project Structure

```text
validator/
├── packages/
│   ├── frontend/           # React + Vite UI (wizard + pages)
│   └── backend/            # Node.js/Express API server
├── package.json            # Workspace root configuration
└── README.md               # Project overview (this file)
```

The backend package includes additional design docs:

- `ANALYSIS_API.md` – Detailed analysis API contract.
- `PROMPT_TEMPLATES.md` – Methodology prompt definitions and design.
- `SESSION_STORE.md` – Session store design and usage.
- `IMPLEMENTATION_SUMMARY.md` – Implementation notes and integration points.

---

## Getting Started

### Prerequisites

- Node.js (see `.nvmrc` for the recommended version)
- npm 7+ (for workspaces)

### Installation

From the repo root:

```bash
npm install
```

### Running in Development

Run frontend and backend together:

```bash
npm run start:dev
```

Or individually:

```bash
# Backend (Express API)
npm run start:backend

# Frontend (Vite dev server)
npm run start:frontend
```

By default:

- Backend listens on `http://localhost:5001` (configurable via `PORT`).
- Frontend runs at `http://localhost:3000` and proxies `/api` to the backend.

---

## Environment Configuration (Backend)

Key environment variables for the backend (see backend README for full list):

- **Session & storage**
  - `SESSION_TTL_MS` – Session TTL in ms (default 24h).
  - `ANALYSIS_TMP_DIR` – Base directory for PDF/TXT outputs.
  - `FILE_TTL_MS`, `FILE_CLEANUP_INTERVAL_MS` – Temp file cleanup settings.

- **Email (SMTP)**
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`
  - `SMTP_USER`, `SMTP_PASS`
  - `EMAIL_FROM`

Note: **LLM API keys are never read from env** in this app; they are always supplied per request from the frontend and not stored in sessions.

---

## Available Workspace Scripts

- `npm run bootstrap` – Install dependencies for all packages.
- `npm run start:dev` – Start all packages in development mode.
- `npm run start:backend` – Start backend dev server only.
- `npm run start:frontend` – Start frontend dev server only.
- `npm run build` – Build all workspaces (if configured).
- `npm run test` – Run tests across workspaces.
- `npm run lint` – Run linting across all packages.

---

## Packages

- **frontend** – React + Vite UI implementing the multi‑step problem validation wizard.
- **backend** – Express API server providing sessions, analysis orchestration, LLM integration, PDF generation, email delivery, and file cleanup.
