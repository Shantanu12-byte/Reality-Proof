# RealityProof Test Infrastructure & Verification Architecture (TEST_INFRA)

## 1. Quality Assurance & Test Philosophy

### 1.1 Opaque-Box, Requirement-Driven Philosophy
The RealityProof testing infrastructure adheres to an **opaque-box (black-box), requirement-driven testing methodology**. Rather than coupling tests to internal implementation details, in-memory mocks, or private state variables, the test harness treats the RealityProof backend, its REST APIs, and the underlying MongoDB Atlas database as integrated systems under test.

Every test case is derived directly from the authoritative specifications established in `ORIGINAL_REQUEST.md` and `PROJECT.md`:
1. **Verifiable Contracts Over Implementation Details**: Tests validate public HTTP REST interfaces, Mongoose document lifecycle behaviors, schema validation rejections, and database persistence states.
2. **Zero Synthetic Mocks in Verification**: All test runs execute against real MongoDB database instances. In-memory dummy arrays, hardcoded fallback objects, and mock spies are strictly banned from verification suites.
3. **Deterministic Output & Authoritative Derivation**: Expected outputs are derived from explicit business rules (e.g., Haversine GPS geo-fence distance <= 100m, evidence penalty deduction formulas, Mongoose schema uniqueness constraints, and dynamic worker metric aggregations).
4. **Idempotence & Strict Zero-Residue Teardown**: Every test suite cleans up all created artifacts using isolated test keys (e.g., prefix `VERIFY-WRK-*`, `VERIFY-RP-*`, `VERIFY-ACT-*`) ensuring the database contains zero residual test artifacts before and after execution.

---

## 2. Feature Inventory & Coverage Mapping

The test infrastructure comprehensively covers the five core features specified across `ORIGINAL_REQUEST.md` and `PROJECT.md`:

| Feature ID | Feature Name | Core Requirements | Primary Verification Target |
|---|---|---|---|
| **F1** | **Interactive & Live MongoDB Collections & CRUD** | `Worker`, `Task`, and `Activity` collections must be active, indexed, interactive, and support full Create-Read-Update-Delete cycles with population and aggregation. | `backend/verify-db.js`<br>`backend/verify-dynamic-live.js` |
| **F2** | **Complete Eradication of Dummy Data** | Total elimination of static demo tasks (`RP-1015` through `RP-1024`), mock arrays, and auto-seeded dummy data across backend, seeders, and API responses. | `backend/verify-dynamic-live.js`<br>`backend/verify-db.js` |
| **F3** | **Live Worker Preservation & Dynamic State Propagation** | Preserve the 8 authentic field workers (`WRK-401` to `WRK-408`). Dynamically propagate task completion to worker `completedJobs`, `balance`, `accuracy`, and `recentTask`. | `backend/verify-db.js`<br>`backend/verify-dynamic-live.js` |
| **F4** | **Dynamic Verification Engine & Scoring** | Evaluate real GPS coordinates against geo-fence tolerance (<=100m), evaluate evidence completeness, compute confidence score (0-100), and assign outcome status. | `backend/verify-dynamic-live.js`<br>`backend/services/verificationService.js` |
| **F5** | **Dynamic Backend REST Endpoints** | All REST endpoints (`/api/tasks`, `/api/workers`, `/api/dashboard`, `/api/payments`, `/api/telemetry`, `/api/intelligence`) execute live MongoDB queries with zero fallback to static mock data. | `backend/verify-dynamic-live.js` |

---

## 3. Test Design Methodologies

The test harness synthesizes four rigorous test engineering disciplines to ensure complete defect detection and edge-case resilience:

### 3.1 Category-Partition Methodology
Each endpoint and database operation is partitioned into independent functional categories, with input parameters decomposed into non-overlapping equivalence classes:
- **Task Verification Status Categories**:
  - `Verified` (Score >= 85, GPS <= 100m, complete evidence)
  - `Review Required` (Score 50-84, missing non-critical evidence or marginal GPS)
  - `Failed` (Score < 50, critical evidence missing or GPS > 100m breach)
  - `Pending` (Unverified / newly dispatched)
- **Worker Status Categories**:
  - `Active` (eligible for dispatch, balance accumulating)
  - `Idle` (eligible for dispatch, zero tasks today)
  - `Under Review` / `Suspended (Review)` (ineligible for automated payout or dispatch)
- **Financial/Budget Equivalence Classes**:
  - Valid standard positive budget ($10.00 – $500.00)
  - Zero budget ($0.00)
  - Negative values (-$50.00) → must be rejected with 400 Bad Request
  - Malformed strings (`"$NaN"`, `"abc"`) → normalized or rejected

### 3.2 Boundary Value Analysis (BVA)
Tests probe exact thresholds where state transitions and algorithmic validations occur:
- **Geo-Fence Distance**:
  - *At boundary*: 99.9 meters (within fence → full 100 base score preserved)
  - *At boundary*: 100.0 meters (tolerance threshold boundary)
  - *Beyond boundary*: 100.1 meters and 105.0 meters (breached fence → -40 score penalty triggered)
- **Confidence Scoring Range**:
  - Minimum clamped boundary: 0 (cannot drop below 0 despite severe multiple penalties)
  - Maximum clamped boundary: 100 (cannot exceed 100)
  - Verification threshold boundary: 85 (score 84.9 → `Review Required`, score 85.0 → `Verified`)
  - Review threshold boundary: 50 (score 49.9 → `Failed`, score 50.0 → `Review Required`)
- **Worker Metrics Boundaries**:
  - `completedJobs`: 0 (initial insertion boundary), incrementing monotonically (+1)
  - `accuracy`: 0.0% to 100.0%
  - `rating`: 0.0 to 5.0 (Mongoose min: 0, max: 5)

### 3.3 Pairwise Combinatorial Testing
Tests combine multiple interdependent parameters across dimensions:
- `(Verification Status × Payment Status × Worker Assignment)`:
  - `[Verified, Completed, Worker Assigned]` → Normal payout release
  - `[Verified, Pending, Worker Assigned]` → Escrow hold awaiting release
  - `[Review Required, Pending, Worker Assigned]` → Payout blocked under investigation
  - `[Failed, Not Eligible, Worker Assigned]` → Escrow cancelled / withheld
  - `[Pending, Pending, Unassigned]` → New dispatch queue state

### 3.4 Real-World Workloads Across Tiers 1–4
The verification suites simulate real field inspector operations:
1. Multi-city inspection tasks across Pune, Mumbai, Nagpur, Bengaluru.
2. Rapid concurrent task submissions with telemetry updates.
3. Live dashboard metric aggregations aggregating over 100+ simulated facet documents.
4. Clean rollback and idempotent teardown ensuring zero data contamination.

---

## 4. Test Tier Architecture (Tiers 1–4)

```
+---------------------------------------------------------------------------------+
| TIER 4: End-to-End Dynamic Live System & Dummy Eradication                     |
| Runner: backend/verify-dynamic-live.js                                          |
| Scope: Live HTTP REST APIs, zero dummy tasks (RP-1015..RP-1024), worker updates |
+---------------------------------------------------------------------------------+
                                      ▲
                                      │
+---------------------------------------------------------------------------------+
| TIER 3: Dynamic Verification Engine & Business Logic Integration               |
| Runner: backend/verify-dynamic-live.js + backend/verify-db.js                   |
| Scope: Haversine distance, confidence scoring, worker state propagation         |
+---------------------------------------------------------------------------------+
                                      ▲
                                      │
+---------------------------------------------------------------------------------+
| TIER 2: Component & Subsystem Lifecycle / CRUD Operations                       |
| Runner: backend/verify-db.js                                                    |
| Scope: Full CRUD on Worker, Task, Activity; $facet/$group; Schema Constraints    |
+---------------------------------------------------------------------------------+
                                      ▲
                                      │
+---------------------------------------------------------------------------------+
| TIER 1: Smoke & Database Connectivity Foundation                               |
| Runner: backend/verify-db.js & GET /api/health                                  |
| Scope: MongoDB connection, admin ping, collection listing, connection pool      |
+---------------------------------------------------------------------------------+
```

### 4.1 Tier 1: Smoke & Database Connectivity Foundation
- **Goal**: Confirm database reachability, driver configuration, and basic collection readiness before launching higher-level assertions.
- **Verification Steps**:
  1. `connectDB()` connects to MongoDB using `MONGODB_URI` and `DB_NAME`.
  2. `mongoose.connection.readyState === 1` confirmed.
  3. `admin.ping()` responds with `{ ok: 1 }` within 5000ms.
  4. Database collection catalog lists `workers`, `tasks`, and `activities`.
  5. HTTP `/api/health` returns `200 OK` with `{ status: 'ok', mongodb: 'connected' }`.

### 4.2 Tier 2: Component & Subsystem Lifecycle / CRUD Operations
- **Goal**: Validate isolated persistence and schema integrity for all three data models.
- **Verification Steps**:
  1. **Worker Model**:
     - Create test worker document (`VERIFY-WRK-*`).
     - Read back document and verify fields, virtuals (`id`, `location`, `verifiedRate`, `formattedBalance`).
     - Update fields (`completedJobs`, `balance`, `rating`) and verify atomic persistence.
     - Enforce schema uniqueness: duplicate `workerId` or `email` rejected with error 11000.
     - Enforce enum constraints: invalid status (e.g. `'Banned'`) rejected with `ValidationError`.
  2. **Task Model**:
     - Create test task document (`VERIFY-RP-*`) with reference to worker `_id`.
     - Read back with `.populate('assignedWorker')` and verify populated inspector object.
     - Update `verificationStatus`, `confidenceScore`, `paymentStatus`.
     - Enforce budget validation: negative budget rejected.
     - Enforce enum constraints: invalid `verificationStatus` rejected with `ValidationError`.
  3. **Activity Model**:
     - Create audit log document (`VERIFY-ACT-*`).
     - Query by `taskId` and sort by `timestamp: -1`.
     - Verify timestamps and JSON virtuals (`formattedTime`).
  4. **Aggregation Engine**:
     - Execute live `$facet` aggregation on tasks for status counts, total volume, pending payments.
     - Execute `$group` aggregation on workers by city.

### 4.3 Tier 3: Dynamic Verification Engine & Business Logic Integration
- **Goal**: Verify core algorithms execute dynamically with real calculations rather than mock values.
- **Verification Steps**:
  1. **Haversine Geo-Fence Algorithm**:
     - Submission GPS within 50m of task location -> Geo-fence PASS, 0 penalty.
     - Submission GPS > 100m from task location -> Geo-fence FAIL, -40 penalty deducted.
  2. **Evidence Completeness Scoring**:
     - All required evidence items present -> full evidence credit.
     - Missing required evidence items -> -20 penalty per missing item.
  3. **Dynamic Confidence Score Calculation**:
     - Score clamped between 0 and 100.
     - Outcome classification: `>= 85` -> `Verified`, `50-84` -> `Review Required`, `< 50` -> `Failed`.
  4. **Worker State Dynamic Propagation**:
     - Verifying task dynamically increments assigned worker's `completedJobs` by +1.
     - Worker `balance` increases by task budget.
     - Worker `accuracy` is recalculated dynamically.
     - Worker `recentTask` reflects the newly verified task ID.
     - Corresponding `Activity` document recorded in audit log.

### 4.4 Tier 4: End-to-End Dynamic Live System & Dummy Eradication
- **Goal**: Full integration test of live HTTP REST APIs, confirming zero static dummy tasks exist and responses reflect live MongoDB queries.
- **Verification Steps**:
  1. **Zero Dummy Tasks Ingestion**:
     - Query `GET /api/tasks`.
     - Assert that none of the static dummy task IDs (`RP-1015`, `RP-1016`, `RP-1017`, `RP-1018`, `RP-1019`, `RP-1020`, `RP-1021`, `RP-1022`, `RP-1023`, `RP-1024`) exist in the database or response.
     - Assert that tasks returned are authentic or dynamically generated.
  2. **Live Worker Profiles**:
     - Query `GET /api/workers`.
     - Assert the 8 authentic workers (`WRK-401` through `WRK-408`) are retrieved from MongoDB.
     - Assert that worker metrics (`completedJobs`, `balance`, `accuracy`) reflect live database values.
  3. **Live Dashboard Metrics**:
     - Query `GET /api/dashboard/summary`.
     - Assert metrics (`totalTasks`, `verifiedTasks`, `activeInspectors`, `escrowBalance`) are numeric values dynamically aggregated from MongoDB.
  4. **Live Payments & Telemetry Endpoints**:
     - Query `GET /api/payments/summary` and `/api/telemetry/locations`.
     - Verify responses are dynamically generated from live database collections.
  5. **Live End-to-End Task Lifecycle via HTTP**:
     - `POST /api/tasks` creates a dynamic task with auto-sequenced ID.
     - `GET /api/tasks/:id` retrieves the newly created task with populated worker.
     - `PUT /api/tasks/:id` updates verification status to `Verified`.
     - Confirm assigned worker's dynamic state updated in MongoDB.
     - `DELETE /api/tasks/:id` removes test task.
     - Idempotent cleanup confirmed with zero lingering artifacts.

---

## 5. Test Suite Implementation Blueprint

### 5.1 Programmatic MongoDB Verification Suite (`backend/verify-db.js`)
- **Direct Database Test**: Connects directly via Mongoose ODM.
- **Execution Command**: `node backend/verify-db.js`
- **Exit Codes**: `0` = All 10 verification steps pass; `1` = Any step failed.
- **Step Breakdown**:
  1. Connect with Mongoose using `.env` credentials.
  2. Database admin ping verification.
  3. Inspect collections (`workers`, `tasks`, `activities`).
  4. Worker CRUD (Create, Read, Update, Delete).
  5. Task CRUD with populated worker relation.
  6. Activity CRUD with timestamp validation.
  7. Live Aggregation Pipeline (`$facet` on tasks, `$group` on workers).
  8. Schema Validation & Constraint Rejection (duplicate key, enum validation, required fields).
  9. Teardown: Clean removal of all test entities.
  10. Zero-residue verification: Confirm 0 `VERIFY-*` documents remain.

### 5.2 Automated E2E Dynamic Live Test Runner (`backend/verify-dynamic-live.js`)
- **Full-System Integration Test**: Probes the Express application and live MongoDB collections.
- **Execution Command**: `node backend/verify-dynamic-live.js`
- **Exit Codes**: `0` = All dynamic live assertions pass; `1` = Failure detected.
- **Step Breakdown**:
  1. Health check probe (`/api/health` -> 200, mongodb: connected).
  2. Static dummy task eradication audit (verifying absence of `RP-1015`..`RP-1024`).
  3. Live worker profile verification (authentic workers WRK-401..WRK-408 preserved).
  4. Live dashboard summary calculation audit ($facet aggregation validation).
  5. Full HTTP REST task lifecycle (POST task, GET task, PUT verification, DELETE task).
  6. Worker dynamic state propagation verification upon task verification.
  7. Idempotent teardown and zero residue audit.

---

## 6. How to Run the Verification Suites

### 6.1 Database Verification Suite
```powershell
# From project root:
node backend/verify-db.js

# Or from backend directory:
cd backend
npm run verify:db
```

### 6.2 End-to-End Dynamic Live Verification Suite
```powershell
# From project root:
node backend/verify-dynamic-live.js

# Or from backend directory:
cd backend
npm run verify:live
```

### 6.3 Combined Full Verification Suite
```powershell
# Execute both suites sequentially:
node backend/verify-db.js ; node backend/verify-dynamic-live.js
```
