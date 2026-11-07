src/
├── context/
│   └── TaskContext.jsx             # Centralized reactive frontend state
├── layouts/
│   ├── DashboardLayout.jsx         # App shell wrapper
│   ├── Sidebar.jsx                 # Collapsible navigation & workspace selector
│   └── Topbar.jsx                  # Breadcrumbs, search, notifications & profile
├── components/
│   ├── common/
│   │   ├── MetricCard.jsx          # Distinct KPI cards
│   │   ├── StatusBadge.jsx         # Semantic status pills
│   │   ├── ChartCard.jsx           # Chart headers & containers
│   │   ├── Modal.jsx               # Accessible dialog wrapper
│   │   └── Toast.jsx               # Non-intrusive alert toasts
│   ├── dashboard/
│   │   ├── ActivityChart.jsx       # 14-day verification throughput (AreaChart)
│   │   ├── OutcomesDonut.jsx       # 85% / 10% / 5% breakdown (PieChart)
│   │   ├── ExceptionsPanel.jsx     # Requires Attention panel
│   │   ├── RecentActivityTable.jsx # Activity feed table
│   │   ├── WorkerSummary.jsx       # Field worker rankings
│   │   ├── PaymentOverview.jsx     # PayPal escrow card
│   │   └── SystemAuditLog.jsx      # Telemetry audit log
│   └── tasks/
│       ├── CreateTaskModal.jsx     # Task creation modal with validation
│       └── TaskDetailDrawer.jsx    # Evidence inspection slide-over
├── pages/
│   ├── OverviewPage.jsx
│   ├── TasksPage.jsx
│   ├── AIVerificationPage.jsx
│   ├── LiveMapPage.jsx
│   ├── IntelligencePage.jsx
│   ├── PaymentsPage.jsx
│   ├── WorkersPage.jsx
│   ├── SettingsPage.jsx
│   └── HelpPage.jsx
├── data/                           # Modular datasets
│   ├── initialTasks.js
│   ├── metricsData.js
│   ├── exceptionsData.js
│   ├── workersData.js
│   ├── paymentsData.js
│   ├── intelligenceData.js
│   ├── mapLocationsData.js
│   └── systemEventsData.js
└── utils/
    └── formatters.js               # Status and currency formatters