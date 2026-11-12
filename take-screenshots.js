import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:5000/api';
const OUTPUT_DIR = path.resolve('screenshots_submission');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log('--- Starting RealityProof Automated Screenshot Capture ---');
  console.log(`Output Directory: ${OUTPUT_DIR}`);

  // 1. Fetch authentication tokens from backend
  console.log('1. Authenticating Admin and Worker via backend...');
  const adminRes = await fetch(`${API_URL}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'AdminPassword123!' }),
  }).then((r) => r.json());

  if (!adminRes.token) {
    throw new Error('Admin login failed: ' + JSON.stringify(adminRes));
  }
  const adminToken = adminRes.token;
  const adminSession = adminRes.admin;
  console.log('✓ Admin authenticated:', adminSession.name);

  const workerRes = await fetch(`${API_URL}/worker/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workerId: 'WRK001', password: 'testing123' }),
  }).then((r) => r.json());

  if (!workerRes.token) {
    throw new Error('Worker login failed: ' + JSON.stringify(workerRes));
  }
  const workerToken = workerRes.token;
  const workerSession = workerRes.data || workerRes.worker;
  console.log('✓ Worker authenticated:', workerSession.name);

  // 2. Launch Puppeteer Browser
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 2 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();

  // Helper to take screenshot
  async function snap(filename, description) {
    const fullPath = path.join(OUTPUT_DIR, filename);
    await page.screenshot({ path: fullPath, fullPage: false });
    console.log(`✓ [SAVED] ${filename} — ${description}`);
  }

  // ============================================================
  // SECTION 1: PUBLIC & LANDING PAGES (Desktop 1440x900)
  // ============================================================
  console.log('\n--- Capturing Public / Landing Pages ---');

  // Clear storage first
  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2' });
  await page.evaluate(() => localStorage.clear());

  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2' });
  await sleep(1000);
  await snap('01_landing_role_selection.png', 'Role Selection Landing Page (Admin vs Worker)');

  await page.goto(`${BASE_URL}/admin/login`, { waitUntil: 'networkidle2' });
  await sleep(800);
  await snap('02_admin_login.png', 'Admin Authentication Terminal');

  await page.goto(`${BASE_URL}/worker/login`, { waitUntil: 'networkidle2' });
  await sleep(800);
  await snap('03_worker_login.png', 'Worker Field Access Portal Login');

  // ============================================================
  // SECTION 2: ADMIN PORTAL PAGES & KEY FEATURES (Desktop 1440x900)
  // ============================================================
  console.log('\n--- Capturing Admin Console & Key Features ---');

  // Set Admin Auth state in localStorage
  await page.goto(`${BASE_URL}/admin/dashboard`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(
    (tok, sess) => {
      localStorage.setItem('realityproof_admin_token', tok);
      localStorage.setItem('realityproof_admin_session', JSON.stringify(sess));
    },
    adminToken,
    adminSession
  );

  // 4. Admin Overview Dashboard
  await page.goto(`${BASE_URL}/admin/dashboard`, { waitUntil: 'networkidle2' });
  await sleep(1500);
  await snap('04_admin_dashboard_overview.png', 'Admin Overview Dashboard with Real-time KPIs & Activity Charts');

  // 5. Admin Tasks Management Page
  await page.goto(`${BASE_URL}/admin/tasks`, { waitUntil: 'networkidle2' });
  await sleep(1500);
  await snap('05_admin_tasks_management.png', 'Task Operations & Dispatch Queue Management');

  // 6. Key Feature: Create Task Modal Open
  const createBtn = await page.$('button::-p-text("New Task"), button::-p-text("Dispatch"), button::-p-text("Create")');
  if (createBtn) {
    await createBtn.click();
    await sleep(800);
    await snap('06_admin_create_task_modal.png', 'Key Feature: Create Task Modal with Geofence & Evidence Checklist');
    // Close modal
    const closeBtn = await page.$('button::-p-text("Cancel"), button::-p-text("✕")');
    if (closeBtn) await closeBtn.click();
    await sleep(500);
  }

  // 7. Key Feature: Two-Step Delete Verification Modal
  // Try finding delete button on first task row
  const deleteBtn = await page.$('button[title*="Delete"], button[aria-label*="Delete"], button::-p-text("Delete")');
  if (deleteBtn) {
    await deleteBtn.click();
    await sleep(800);
    await snap('07_admin_delete_verification_modal.png', 'Key Feature: Two-Step Quarantine Delete Verification Modal');
    const cancelModal = await page.$('button::-p-text("Cancel")');
    if (cancelModal) await cancelModal.click();
    await sleep(500);
  }

  // 8. Key Feature: Task Detail Drawer
  const taskRow = await page.$('tr[class*="cursor-pointer"], div[class*="cursor-pointer"]');
  if (taskRow) {
    await taskRow.click();
    await sleep(1000);
    await snap('08_admin_task_detail_drawer.png', 'Key Feature: Task Detail Flyout Drawer with Audit Trail');
  }

  // 9. AI Verification & Forensic Triage Page
  await page.goto(`${BASE_URL}/admin/verification`, { waitUntil: 'networkidle2' });
  await sleep(1800);
  await snap('09_admin_ai_verification_page.png', 'AI Verification & Forensic Triage with 10-Step Pipeline & Instructions');

  // 10. Key Feature: High-Res Evidence Inspection Lightbox
  const zoomBtn = await page.$('button[title*="Lightbox"], button::-p-text("Inspect HD"), button::-p-text("Zoom")');
  if (zoomBtn) {
    await zoomBtn.click();
    await sleep(800);
    await snap('10_admin_ai_verification_lightbox.png', 'Key Feature: High-Resolution Photographic Asset Lightbox');
    const closeLightbox = await page.$('button[class*="cursor-pointer"] svg, div[class*="fixed"] button');
    if (closeLightbox) await closeLightbox.click();
    await sleep(500);
  }

  // 11. Fraud Intelligence Page
  await page.goto(`${BASE_URL}/admin/intelligence`, { waitUntil: 'networkidle2' });
  await sleep(1500);
  await snap('11_admin_fraud_intelligence.png', 'Fraud Intelligence Center (pHash Collision Radar & Hash Matches)');

  // 12. Payments & PayPal Escrow Page
  await page.goto(`${BASE_URL}/admin/payments`, { waitUntil: 'networkidle2' });
  await sleep(1500);
  await snap('12_admin_payments_escrow.png', 'PayPal Escrow Ledger, Capture Authorization & Settlements');

  // 13. Live Map GPS Telemetry Page
  await page.goto(`${BASE_URL}/admin/map`, { waitUntil: 'networkidle2' });
  await sleep(2000);
  await snap('13_admin_live_map.png', 'Live GPS Map & Tactical Radar Telemetry Canvas');

  // 14. Workers Fleet Management Page
  await page.goto(`${BASE_URL}/admin/workers`, { waitUntil: 'networkidle2' });
  await sleep(1500);
  await snap('14_admin_workers_fleet.png', 'Field Inspector Workforce Directory & Hardware TPM Attestations');

  // 15. Settings Page
  await page.goto(`${BASE_URL}/admin/settings`, { waitUntil: 'networkidle2' });
  await sleep(1200);
  await snap('15_admin_settings.png', 'System Settings, AI Vision Model Controls & Credentials');

  // 16. Help & Documentation Page
  await page.goto(`${BASE_URL}/admin/help`, { waitUntil: 'networkidle2' });
  await sleep(1200);
  await snap('16_admin_help_docs.png', 'Operational Help & Standard Operating Procedures');

  // ============================================================
  // SECTION 3: WORKER PORTAL (Mobile Viewport: 390x844 - iPhone Style)
  // ============================================================
  console.log('\n--- Capturing Worker Portal (Mobile First) ---');

  // Switch viewport to mobile
  await page.setViewport({ width: 412, height: 892, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });

  // Clear admin auth and set worker auth in localStorage
  await page.goto(`${BASE_URL}/worker/dashboard`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(
    (tok, sess) => {
      localStorage.clear();
      localStorage.setItem('realityproof_worker_token', tok);
      localStorage.setItem('realityproof_worker_id', sess.workerId);
      localStorage.setItem('realityproof_worker_session', JSON.stringify(sess));
    },
    workerToken,
    workerSession
  );

  // 17. Worker Dashboard
  await page.goto(`${BASE_URL}/worker/dashboard`, { waitUntil: 'networkidle2' });
  await sleep(1500);
  await snap('17_worker_dashboard.png', 'Worker Dashboard (ON DUTY shift, RTK sensor lock, Settlement ledger)');

  // 18. Worker Tasks Queue
  await page.goto(`${BASE_URL}/worker/tasks`, { waitUntil: 'networkidle2' });
  await sleep(1500);
  await snap('18_worker_tasks_queue.png', 'Worker Assigned Task Stream & Priority Filter Tabs');

  // 19. Worker Task Detail Page (RP-1002)
  await page.goto(`${BASE_URL}/worker/tasks/RP-1002`, { waitUntil: 'networkidle2' });
  await sleep(1500);
  await snap('19_worker_task_detail.png', 'Worker Task Detail (Operational Briefing & Evidence Checklist)');

  // 20. Worker Evidence Capture Studio
  await page.goto(`${BASE_URL}/worker/tasks/RP-1002/submit`, { waitUntil: 'networkidle2' });
  await sleep(1500);
  await snap('20_worker_evidence_capture_studio.png', 'Worker Evidence Capture Studio (In-situ Photo Upload & GPS Fix)');

  // 21. Worker Submissions History
  await page.goto(`${BASE_URL}/worker/submissions`, { waitUntil: 'networkidle2' });
  await sleep(1500);
  await snap('21_worker_submissions_history.png', 'Worker Submissions History (Cryptographic Attestations & AI Finding Badges)');

  // 22. Worker Profile & Switch Demo Modal
  await page.goto(`${BASE_URL}/worker/profile`, { waitUntil: 'networkidle2' });
  await sleep(1200);
  await snap('22_worker_profile.png', 'Worker Profile & Hardware Enclave Verification Identity');

  // Open switch worker modal
  const switchWorkerBtn = await page.$('button[title*="Switch"], button[title*="worker"], button svg.lucide-users');
  if (switchWorkerBtn) {
    await switchWorkerBtn.click();
    await sleep(800);
    await snap('23_worker_switch_demo_modal.png', 'Key Feature: Switch Demo Field Inspector Context Modal');
  }

  await browser.close();
  console.log('\n============================================================');
  console.log(`✓ All screenshots captured successfully in: ${OUTPUT_DIR}`);
  console.log('============================================================');
}

main().catch((err) => {
  console.error('Fatal screenshot error:', err);
  process.exit(1);
});
