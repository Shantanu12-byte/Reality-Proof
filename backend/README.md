# RealityProof — Backend API (Phase 2)

Node.js, Express, MongoDB, and Mongoose backend server powering the RealityProof physical verification dashboard.

---

## 1. Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **MongoDB**: v5.0 or higher running locally on port 27017 (or MongoDB Atlas URI)

### Quick Start
```bash
# 1. Navigate to backend directory
cd backend

# 2. Install dependencies
npm install

# 3. Create .env file from example
cp .env.example .env

# 4. Seed initial realistic demo data (idempotent, avoids duplicates)
npm run seed

# 5. Start the backend server
npm start
# Or for auto-reload during development:
npm run dev
```

The server will start at `http://localhost:5000` with health check at `http://localhost:5000/api/health`.

---

## 2. Environment Variables (.env)

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/realityproof
NODE_ENV=development
CLIENT_URL=http://localhost:3000
```

---

## 3. Database Schemas

### Task Schema (`Task.js`)
- `taskId`: Unique task identifier string (e.g. `RP-1024`, indexed)
- `title`: Task inspection title (e.g. `Store Display Inspection`)
- `description`: Detailed operational instructions for the field worker
- `category`: Task category (e.g. `Visual Verification`, `Cold Chain Audit`)
- `location`: Operational city/zone (e.g. `Pune`, `Mumbai`, `Nashik`, `Nagpur`)
- `address`: Specific site address / facility landmark
- `assignedWorker`: Reference to `Worker` model ObjectId (populated with worker profile)
- `budget`: Payout budget (numeric USD)
- `deadline`: Target completion timestamp
- `status`: Lifecycle status (`Pending`, `In Progress`, `Completed`, `Under Review`, `Cancelled`)
- `verificationStatus`: Multi-modal AI decision (`Verified`, `Review Required`, `Failed`, `Pending`)
- `confidenceScore`: Percentage confidence score (0 - 100)
- `evidenceRequirements`: Array of `{ label, status, description }`
- `aiChecks`: Object with `{ perceptualHashMatch, exifVerified, geoFenceMatch, lightingAdequacy, shelfFillRate }`
- `evidenceThumbnails`: Array of evidence image URLs
- `exceptionReason`: Explanation for any flag or review requirement
- `paymentStatus`: Escrow state (`Pending`, `Completed`, `Not Eligible`)
- `submitted`: Time submitted (e.g. `10:42 AM`)
- `date`: Submission date (`YYYY-MM-DD`)
- `createdAt`, `updatedAt`: Auto timestamps

### Worker Schema (`Worker.js`)
- `workerId`: Unique inspector ID string (e.g. `WRK-401`, indexed)
- `name`: Inspector full name
- `email`: Unique email address
- `phone`: Mobile contact number
- `city`: Operating city / location
- `zone`: Assigned territory / district
- `rating`: Performance rating out of 5.0
- `accuracy`: Verification accuracy percentage (e.g. 99.4)
- `completedJobs`: Total successful verifications
- `tasksToday`: Current day active dispatches
- `balance`: Available wallet balance in USD
- `status`: Inspector status (`Active`, `Idle`, `Under Review`, `Suspended (Review)`)
- `reliabilityScore`: Trust rating score (0 - 100)
- `avatar`: Two-letter initials badge
- `paypalStatus`: Linked wallet state (`Linked & Verified`, `Payout Hold`)
- `recentTask`: Most recent task name
- `createdAt`, `updatedAt`: Auto timestamps

### Activity Schema (`Activity.js`)
- `taskId`: Associated task identifier (e.g. `RP-1024`)
- `activityType`: Event code (e.g. `AI_VERIFICATION_PASS`, `PAYPAL_AUTH_HOLD`, `TASK_CREATED`)
- `title`: Readable headline
- `description`: Event narrative details
- `actor`: System entity or user triggering event
- `timestamp`: Date timestamp
- `level`: Severity level (`info`, `success`, `warning`, `danger`)
- `source`: Engine emitting event (e.g. `VisionInferenceEngine`, `PayPalPaymentBridge`)

---

## 4. API Endpoints

### Health Check
- `GET /api/health` — Verifies server and MongoDB connectivity status.

### Tasks (`/api/tasks`)
- `GET /api/tasks` — List tasks. Supports `?search=...`, `?status=...`, `?city=...`.
- `GET /api/tasks/:id` — Get single task by `taskId` (e.g. `RP-1024`) or MongoDB `_id`.
- `POST /api/tasks` — Create new verification task. Auto-generates sequential ID (e.g. `RP-1025`).
- `PUT /api/tasks/:id` — Update task status, verification outcome, and budget.
- `DELETE /api/tasks/:id` — Delete task by ID.

### Workers (`/api/workers`)
- `GET /api/workers` — List inspectors. Supports `?search=...`, `?city=...`.
- `GET /api/workers/:id` — Get worker details and task history.
- `POST /api/workers` — Onboard new field inspector.
- `PUT /api/workers/:id` — Update inspector rating, status, or balance.

### Dashboard (`/api/dashboard`)
- `GET /api/dashboard/summary` — Returns live KPI metrics, outcome distributions, and zone aggregations computed directly from MongoDB.
- `GET /api/dashboard/activity` — Returns recent telemetry audit records.
- `GET /api/dashboard/exceptions` — Returns flagged tasks requiring manual operational review.

---

## 5. Postman Testing Guide

1. **Importing into Postman**:
   - Create a new Collection named `RealityProof API`.
   - Set Collection Variable: `baseUrl` = `http://localhost:5000/api`.

2. **Sample Requests**:

   - **Get All Tasks**:
     - `GET {{baseUrl}}/tasks`
     - Expected: 200 OK, JSON list of tasks populated with assigned workers.

   - **Filter Tasks by Status**:
     - `GET {{baseUrl}}/tasks?status=Verified&city=Pune`
     - Expected: 200 OK, matching tasks in Pune with status Verified.

   - **Get Task By ID**:
     - `GET {{baseUrl}}/tasks/RP-1024`
     - Expected: 200 OK with full task details and evidence checklist.

   - **Create Task**:
     - `POST {{baseUrl}}/tasks`
     - Headers: `Content-Type: application/json`
     - Body:
       ```json
       {
         "name": "Solar Inverter Site Audit",
         "description": "Inspect inverter display panel and cooling fan clearance.",
         "location": "Pune",
         "workerName": "Rahul Sharma",
         "budget": "45.00",
         "deadline": "2026-11-10 18:00",
         "evidenceRequirements": [
           { "label": "LCD Status Screen", "status": "pending" },
           { "label": "Geo-Fence Geotag", "status": "pending" }
         ]
       }
       ```
     - Expected: 201 Created with auto-generated `taskId` (e.g. `RP-1025`).

   - **Update Task**:
     - `PUT {{baseUrl}}/tasks/RP-1024`
     - Headers: `Content-Type: application/json`
     - Body:
       ```json
       {
         "verificationStatus": "Verified",
         "paymentStatus": "Completed"
       }
       ```
     - Expected: 200 OK with updated verification status and activity logged.

   - **Dashboard Summary**:
     - `GET {{baseUrl}}/dashboard/summary`
     - Expected: 200 OK with `totalTasks`, `verifiedTasks`, `underReviewTasks`, `flaggedTasks`, `pendingPaymentAmount`, and `outcomes`.

