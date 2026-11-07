# RealityProof — Complete Worker Portal and Admin Dashboard Separation

RealityProof is an enterprise AI-powered physical task verification platform. Businesses dispatch real-world tasks to field workers, collect authenticated photographic and sensor evidence, and leverage multi-layer AI vision models (Groq / Gemini) to verify task execution before capturing authorized PayPal escrow funds.

---

## 🏛 Architecture & Portal Separation

The application enforces **complete separation** between the **Admin Operations Dashboard** and the **Mobile Field Worker Portal** across frontend routing, UI layouts, authentication state, and backend authorization middleware.

```text
frontend/ (src/)
├── admin/
│   ├── auth/              # AdminAuthContext, AdminProtectedRoute
│   ├── components/        # Enterprise dashboard, task creator, payments modal
│   ├── layouts/           # Admin DashboardLayout, Sidebar, Topbar
│   ├── pages/             # AdminLoginPage, OverviewPage, TasksPage, WorkersPage, etc.
│   └── services/          # adminApi (Bearer token injected automatically)
│
├── worker/
│   ├── auth/              # WorkerAuthContext, WorkerProtectedRoute
│   ├── components/        # Mobile evidence camera, checklist, telemetry
│   ├── layouts/           # WorkerLayout (mobile thumb nav, worker identity & logout)
│   ├── pages/             # WorkerLoginPage, WorkerDashboardPage, WorkerTasksPage, etc.
│   └── services/          # workerApi (Worker JWT Bearer token injected)
│
└── shared/
    ├── components/        # ChartCard, MetricCard, Modal, StatusBadge, Toast
    ├── constants/         # Domain constants and seed fixtures
    ├── context/           # TaskContext
    ├── pages/             # RoleSelectionLandingPage (Root '/')
    ├── services/          # httpClient (resilient fetch wrapper)
    └── utils/             # Formatters and date helpers
```

---

## 🔗 Application Route Separation

### 1. Root Landing Page
- `/` — Professional role-selection landing page allowing users to choose between **Admin Login** and **Worker Login**.

### 2. Admin Operations Application
- `/admin/login` — Dedicated Admin authentication terminal
- `/admin/dashboard` — Overview KPIs, exceptions triage, live verification feed
- `/admin/tasks` — Task dispatching, filtering, and lifecycle management
- `/admin/workers` — Field inspector workforce directory & reliability metrics
- `/admin/verification` — Multi-layer AI Vision analysis console & manual reviewer overrides
- `/admin/intelligence` — Perceptual hash collision radar & fraud forensics
- `/admin/payments` — Real PayPal REST v2 escrow authorization & capture console
- `/admin/map` — GPS telemetry radar & site inspector

### 3. Field Worker Portal (Mobile First)
- `/worker/login` — Worker ID & password authentication
- `/worker/dashboard` — Worker mobile home, assigned active tasks & available balance
- `/worker/tasks` — List of tasks strictly assigned to the authenticated worker
- `/worker/tasks/:taskId` — Task instructions, geofence coordinates & checklist
- `/worker/tasks/:taskId/submit` — In-situ camera capture & geotagged evidence upload
- `/worker/submissions` — Submission history and AI verification reports
- `/worker/profile` — Worker performance stats, rating, PayPal status & logout

*Note: Worker views contain zero admin navigation, links, or metrics.*

---

## 🔐 Credentials for Demo & Testing

> [!WARNING]
> **DEMO USE ONLY**: The following accounts and passwords are for local evaluation and hackathon judging only. Never use these credentials in a live production environment. Change all secret keys and enforce strong passwords for production deployments.

### 1. Admin Account
- **Login URL**: `http://localhost:3000/admin/login`
- **Username**: `admin` *(or `admin@realityproof.ai`)*
- **Password**: `AdminPassword123!`

### 2. Seeded Field Worker Accounts
- **Login URL**: `http://localhost:3000/worker/login`
- **Shared Password**: `testing123`
- **Seeded Worker IDs**:
  - `WRK001` — Neha Joshi (Pune West & Central, Rating 5.0, 99.4% accuracy)
  - `WRK002` — Rahul Sharma (Pune East / Viman Nagar, Rating 4.9, 98.2% accuracy)
  - `WRK003` — Kavita Deshmukh (Mumbai Suburban, Rating 4.9, 97.8% accuracy)
  - `WRK004` — Aman Verma (Nagpur Logistics Hub, Rating 4.8, 96.5% accuracy)

*All credentials are encrypted in MongoDB using `bcrypt` (10 salt rounds). Rate limiting middleware protects login endpoints from brute-force attempts.*

---

## ⚙️ Environment Configuration

Copy `.env.example` to `backend/.env` and supply the required values:

```bash
cp .env.example backend/.env
```

| Variable | Description | Default / Example | Required |
| :--- | :--- | :--- | :--- |
| `PORT` | Backend server port | `5000` | Yes |
| `MONGODB_URI` | MongoDB connection URI | `mongodb://localhost:27017/realityproof` | Yes |
| `DB_NAME` | Database name | `RealityProof` | Yes |
| `NODE_ENV` | Environment mode | `development` or `production` | Yes |
| `CLIENT_URL` | Allowed CORS origin for frontend | `http://localhost:3000` | Yes |
| `JWT_SECRET` | Cryptographic secret for signing JWTs | Minimum 32-character random string | **CRITICAL** |
| `GROQ_API_KEY` | Groq Vision & Reasoning API key | `gsk_...` | Optional (falls back to mock/Gemini) |
| `GROQ_MODEL` | Groq model identifier | `openai/gpt-oss-20b` | No |
| `GEMINI_API_KEY` | Google Gemini Multimodal Vision API key | `AIza...` | Optional |
| `PAYPAL_MODE` | PayPal operational mode | `sandbox` or `live` | Yes |
| `PAYPAL_CLIENT_ID` | PayPal REST app client ID | `YOUR_PAYPAL_CLIENT_ID` | Yes |
| `PAYPAL_CLIENT_SECRET` | PayPal REST app secret | `YOUR_PAYPAL_CLIENT_SECRET` | Yes |
| `PAYPAL_WEBHOOK_ID` | PayPal webhook verification ID | `YOUR_WEBHOOK_ID` | In Production |
| `PAYPAL_PAYOUTS_ENABLED` | Direct worker PayPal payouts toggle | `false` | No |

---

## 🛡 Security & Verification Policies

1. **Two-Step Task Deletion Verification**:
   - Deleting any task requires typing `"delete"` into the confirmation modal (`DeleteTaskModal.jsx`). Tasks cannot be deleted with a single accidental click, protecting historical audit records.
2. **GPS Map Display Lifecycle**:
   - Tasks are rendered on the live telemetry map only while active/in-progress. Once a task reaches `status: "Completed"` and its payment has been settled or released, it is automatically removed from the live map to keep operational tracking clean.
3. **Critical Exception Triage Rule**:
   - Critical tasks under review appear in the Exceptions & Fraud triage radar. If and only if an administrator formally rejects the task (`decision: "reject"`), the task status transitions to `"Rejected"` and is purged from the active flag exception list.
4. **Structured Redaction Logging**:
   - Production logs strictly redact authorization headers, tokens, API keys, passwords, and sensitive payment data. Sensitive uploaded evidence is stored locally under `backend/uploads/evidence/` and excluded from version control via `.gitignore`.

---

## 🛡 Backend Role-Based Access Control (RBAC)

Security is enforced at the server level via `backend/middleware/authMiddleware.js`. Never trust client-supplied IDs.

### Authorization Middleware
```javascript
authenticate   // Validates signed JWT from Authorization: Bearer <token>
requireAdmin   // Enforces req.user.role === 'admin' (403 if worker)
requireWorker  // Enforces req.user.role === 'worker' (403 if admin)
```

### Endpoints Protected by Role
| Endpoint | Method | Role Required | Protection Rule |
| :--- | :--- | :--- | :--- |
| `/api/admin/login` | `POST` | Public | Validates admin credentials & issues admin JWT |
| `/api/admin/me` | `GET` | Admin | Returns current authenticated admin profile |
| `/api/dashboard/*` | `GET` | Admin | 403 Forbidden for workers |
| `/api/tasks` | `GET`, `POST` | Admin | 403 Forbidden for workers |
| `/api/tasks/:id` | `GET`, `PUT`, `DELETE` | Admin | 403 Forbidden for workers |
| `/api/workers` | `GET`, `POST` | Admin | 403 Forbidden for workers |
| `/api/verifications` | `GET` | Admin | 403 Forbidden for workers |
| `/api/verifications/:id/review` | `POST` | Admin | Worker cannot approve or reject verifications |
| `/api/payments/summary` | `GET` | Admin | 403 Forbidden for workers |
| `/api/payments/:id/capture` | `POST` | Admin | Worker cannot capture PayPal payments |
| `/api/payments/:id/refund` | `POST` | Admin | Worker cannot refund payments |
| `/api/intelligence/*` | `GET` | Admin | 403 Forbidden for workers |
| `/api/worker/login` | `POST` | Public | Validates worker ID + password & issues worker JWT |
| `/api/worker/me` | `GET` | Worker | Returns authenticated worker stats & balance |
| `/api/worker/tasks` | `GET` | Worker | Queries only tasks where `assignedWorker === req.worker._id` |
| `/api/worker/tasks/:id` | `GET` | Worker | Returns 403 if task is assigned to another worker |
| `/api/evidence/upload` | `POST` | Worker | Saves uploaded multipart photos |
| `/api/evidence/submit` | `POST` | Worker | Returns 403 if worker tries submitting on unassigned task |

---

## 🧪 Automated Testing & Verification

Run the full testing suites to verify zero regressions:

```bash
# 1. Full RBAC & Portal Separation Suite (13 checklist items)
npm run test:rbac

# 2. Worker Portal Mobile Flow Suite (36 assertions)
npm run test:worker

# 3. Phase 4 AI Vision Engine Verification Suite (45 assertions)
npm run test:phase4

# 4. Phase 6 PayPal Escrow Integration Suite (33 assertions)
npm run test:phase6

# 5. Production Bundle Check
npm run build
```

---

## 🚀 Running Locally

```bash
# Terminal 1: Backend Server (Port 5000)
npm run server

# Terminal 2: Vite React Frontend (Port 3000)
npm run dev
```

Visit `http://localhost:3000` to access the Role Selector landing page.
