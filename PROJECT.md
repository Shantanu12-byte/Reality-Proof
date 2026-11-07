# Project: RealityProof Dynamic Backend & Dummy Data Eradication

## Architecture
- **Backend Architecture**: Node.js ES Modules application with Express 4.21.2 and Mongoose 8.9.2 connecting to MongoDB Atlas (`RealityProof` database).
- **Core Entities & Collections**:
  - `Worker` (`workers` collection): 8 authenticated field inspectors (WRK-401 to WRK-408). Live dynamic fields: `rating`, `accuracy`, `completedJobs`, `tasksToday`, `balance`, `status`, `reliabilityScore`, `recentTask`.
  - `Task` (`tasks` collection): Verification jobs with dynamic `taskId` (RP-xxxx), geo-fence coordinates, evidence assets, dynamic `confidenceScore`, `verificationStatus`, and `paymentStatus`.
  - `Activity` (`activities` collection): Real-time audit trail events for task dispatch, verification, payment release, and worker state transitions.
- **Data Flow**:
  1. Field Worker data in `Worker.js` is preserved as the single source of truth for inspector profiles in MongoDB.
  2. Tasks are dispatched and assigned to real workers.
  3. Dynamic verification algorithms evaluate evidence completeness and GPS geo-fence proximity, assigning genuine confidence scores (0-100) and outcomes (`Verified`, `Review Required`, `Failed`).
  4. Task lifecycle events dynamically propagate state changes to the assigned `Worker` (incrementing `completedJobs`, recalculating `accuracy`, updating `balance`).
  5. Audit log events are written to `Activity` for every transition.
  6. Backend provides live endpoints for tasks, workers, dashboard aggregations, payments escrow, telemetry, and intelligence.
  7. All static dummy datasets, mock fixtures, and in-memory fallback arrays are completely eradicated.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Seeder Bug Remediation | Fix `ReferenceError: demoActivities is not defined` in `backend/seed/seedData.js`. | M1 | Survey |
| 2 | Worker Entity Preservation | Preserve the 8 authentic field worker profiles (WRK-401 to WRK-408) as live interactive documents in MongoDB. | M1 | Survey / Prompt R2 |
| 3 | Static Task Seeder Eradication | Remove `demoTasks` and eliminate `autoSeedIfEmpty` injection of static mock tasks into MongoDB. | M1 | Survey / Prompt R2 |
| 4 | Database Sanitization | Cleanly purge deprecated static dummy tasks (`RP-1015` through `RP-1024`) from MongoDB Atlas. | M1 | Survey / Prompt R2 |
| 5 | Dynamic Task ID Sequence | Replace string regex sorting with robust numeric sequence extraction for auto-incrementing `RP-xxxx` IDs. | M1 | Survey / Prompt R1 |
| 6 | Dynamic Verification Engine | Implement rule-based verification algorithm (GPS Haversine distance check, evidence validation, genuine confidence score 0-100, dynamic status assignment). | M1 | Survey / Prompt R1 |
| 7 | Worker Metric Dynamic Propagation | Automatically update assigned worker's `completedJobs`, `balance`, `accuracy`, and `recentTask` in MongoDB upon task verification/completion. | M1 | Survey / Prompt R1, R2 |
| 8 | Dynamic Dashboard Metrics | Replace static strings (e.g. `change: '+100%'`, all-time mapped to today) in `dashboardController.js` with live temporal calculations. | M1 | Survey / Prompt R1 |
| 9 | Payments & Escrow Live API | Implement `GET /api/payments/summary`, `GET /api/payments/transactions`, and `POST /api/payments/release/:id` backed by live MongoDB queries. | M1 | Survey / Prompt R1 |
| 10 | Telemetry & Live Map API | Implement `GET /api/telemetry/locations` aggregating real-time GPS coordinates of active tasks and field workers. | M1 | Survey / Prompt R1 |
| 11 | Intelligence & Security API | Implement `GET /api/intelligence/summary` calculating real anomaly rates and duplicate check flags from MongoDB. | M1 | Survey / Prompt R1 |
| 12 | Frontend TaskContext Decoupling | Eradicate static imports (`initialTasks`, `workersData`, `metricsData`, `exceptionsData`), initialize with empty state, and eliminate mock task creation fallbacks. | M2 | Survey / Prompt R2 |
| 13 | Frontend Pages Live API Integration | Wire `PaymentsPage`, `LiveMapPage`, `IntelligencePage`, `WorkersPage`, and `Sidebar` badges to consume dynamic backend API endpoints. | M2 | Survey / Prompt R2 |
| 14 | Static Data File Eradication | Remove or deprecate static files in `src/data/` (`initialTasks.js`, `metricsData.js`, `exceptionsData.js`, `paymentsData.js`, etc.). | M2 | Survey / Prompt R2 |
| 15 | Programmatic DB CRUD & Verification Suite | Standalone test suite (`backend/verify-db.js`) testing connection, collection existence, full CRUD across all 3 collections, and idempotent teardown. | M3 | Survey / Prompt R3 |
| 16 | E2E Dynamic Live Verification | Comprehensive automated test suite (`backend/verify-dynamic-live.js`) validating 100% dynamic operations, worker propagation, and zero dummy data. | M3 | Survey / Prompt R1, R2, R3 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Backend Core, Dynamic Algorithms & Live Database Integration | Seeder bug fix, worker preservation, static task elimination, DB sanitization, dynamic task ID sequence, rule-based verification engine, worker state propagation, dynamic dashboard metrics, and live Payments/Telemetry/Intelligence APIs. | none | IN_PROGRESS |
| M2 | Frontend Decoupling & Dummy Data Eradication | Clean `TaskContext.jsx` of static defaults and mock fallbacks, bind all pages and navigation badges to dynamic APIs, clean/deprecate `src/data/` mock files. | M1 | PLANNED |
| M3 | Final Milestone: 100% E2E Test Suite Pass & Adversarial Hardening | Phase 1: Implement `backend/verify-db.js` and `backend/verify-dynamic-live.js` and pass 100% of E2E tests (Tiers 1-4). Phase 2: Tier 5 adversarial coverage hardening. | M2 | PLANNED |

## Interface Contracts

### 1. Database Seeder Contract (`backend/seed/seedData.js` ↔ `backend/config/db.js`)
- `syncRegisteredWorkers()`:
  - Input: None.
  - Action: Ensures the 8 authentic field workers (WRK-401 to WRK-408) exist in MongoDB. Uses upsert `{ workerId: w.workerId }` with `$setOnInsert` for dynamic fields (`completedJobs: 0`, `balance: 0`, `tasksToday: 0`) so existing live progress is NEVER overwritten.
  - Returns: `{ success: true, count: Number }`.
  - Guarantee: NEVER seeds dummy tasks or activities into MongoDB.

### 2. Dynamic Verification Engine Contract (`backend/services/verificationService.js`)
- `evaluateTaskVerification(task, evidence, submissionGps)`:
  - Input:
    - `task`: Target coordinates `{ latitude, longitude }`, required evidence criteria.
    - `evidence`: Array of submitted evidence assets `{ type, url, gps: { latitude, longitude }, hash }`.
    - `submissionGps`: `{ latitude, longitude }`.
  - Logic:
    - Computes Haversine distance between submission GPS and task location. Tolerance threshold: <= 100 meters.
    - Evaluates required evidence completeness (all required photo/sensor angles present).
    - Computes confidence score:
      - 100 base score.
      - -40 if GPS distance > 100m.
      - -20 per missing required evidence item.
      - Clamp between 0 and 100.
    - Output:
      - `confidenceScore`: Number (0-100).
      - `verificationStatus`: 'Verified' (if score >= 85), 'Review Required' (if 50-84), 'Failed' (if < 50).
      - `exceptionReason`: String explanation if status is 'Review Required' or 'Failed'.

### 3. Worker State Propagation Contract (`taskController.js` ↔ `Worker.js` & `Activity.js`)
- On Task Verification (`status: 'Verified'`):
  - Increments assigned worker's `completedJobs` by +1.
  - Updates worker `balance`: `worker.balance += task.budget`.
  - Calculates updated `accuracy`: `Math.round((verifiedCount / totalCompletedCount) * 100)`.
  - Updates `recentTask`: `task.taskId`.
  - Records an `Activity` document: `{ activityType: 'VERIFICATION_PASSED', taskId, workerId, details }`.

### 4. Payments API Contract (`backend/routes/paymentRoutes.js` ↔ Client)
- `GET /api/payments/summary`:
  - Returns: `{ escrowBalance: Number, pendingPayouts: Number, completedPayouts: Number, totalPaid: Number }`.
- `GET /api/payments/transactions`:
  - Returns: Array of transaction objects mapped from live tasks.
- `POST /api/payments/release/:id`:
  - Updates task `paymentStatus: 'Completed'`.
  - Logs payout activity.

### 5. Telemetry API Contract (`backend/routes/telemetryRoutes.js` ↔ Client)
- `GET /api/telemetry/locations`:
  - Returns: Array of active GPS telemetry points combining field workers' active cities and in-progress task locations.

### 6. Intelligence API Contract (`backend/routes/intelligenceRoutes.js` ↔ Client)
- `GET /api/intelligence/summary`:
  - Returns: `{ anomalyRate: Number, flaggedTasks: Number, duplicateHashCount: Number, riskScore: Number, clusters: Array }`.

## Code Layout
- `backend/config/db.js`: MongoDB connection and clean worker synchronization hook.
- `backend/models/`:
  - `Worker.js`: Live worker Mongoose schema and methods.
  - `Task.js`: Live task schema, compound indexes, virtuals.
  - `Activity.js`: Live activity audit trail schema.
- `backend/services/`:
  - `verificationService.js`: Dynamic rule-based verification and scoring engine.
- `backend/controllers/`:
  - `taskController.js`: Dynamic Task CRUD, numeric ID sequencing, verification hook, worker propagation.
  - `workerController.js`: Worker directory queries, profile management, live history.
  - `dashboardController.js`: Live $facet aggregations, real-time KPI metrics and exceptions.
  - `paymentController.js`: Dynamic escrow balance, transactions, and release operations.
  - `telemetryController.js`: Live GPS node aggregation.
  - `intelligenceController.js`: Live anomaly and fraud metric aggregation.
- `backend/routes/`:
  - `taskRoutes.js`: `/api/tasks`
  - `workerRoutes.js`: `/api/workers`
  - `dashboardRoutes.js`: `/api/dashboard`
  - `paymentRoutes.js`: `/api/payments`
  - `telemetryRoutes.js`: `/api/telemetry`
  - `intelligenceRoutes.js`: `/api/intelligence`
- `backend/seed/`:
  - `seedData.js`: Clean worker synchronization only (zero mock tasks, zero mock activities).
- `backend/verify-db.js`: Dedicated programmatic verification test script for MongoDB CRUD & collections.
- `backend/verify-dynamic-live.js`: Automated end-to-end live data and algorithm verification test script.
- `src/context/TaskContext.jsx`: Decoupled dynamic React context with zero static fallback data.

