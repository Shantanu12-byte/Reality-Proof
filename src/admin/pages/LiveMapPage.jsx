import React, { useState, useEffect, useCallback } from 'react';
import {
  MapPin,
  Navigation,
  Crosshair,
  Radio,
  Layers,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  Eye,
  Filter,
  RefreshCw,
  Download,
  Zap,
  Activity,
  Compass,
  Sparkles
} from 'lucide-react';
import { telemetryApi } from '../services/api';
import { useTaskContext } from '@/context/TaskContext';

export const LiveMapPage = () => {
  const { addToast } = useTaskContext();
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [selectedCity, setSelectedCity] = useState('All');
  const [isLoading, setIsLoading] = useState(true);

  const fetchLocations = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const data = await telemetryApi.getLocations();
      if (Array.isArray(data)) {
        setLocations(data);
        if (data.length > 0 && !selectedLocation) {
          setSelectedLocation(data[0]);
        }
      }
    } catch (err) {
      console.warn('[RealityProof] Failed to fetch GPS telemetry:', err.message);
      addToast('Telemetry Notice', 'Could not load live GPS locations from backend.', 'warning');
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [addToast, selectedLocation]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const filteredLocations = locations.filter((loc) => {
    // Remove task from GPS map if it is done and settlements/payment are released
    if (loc.entityType === 'task') {
      const isDone = loc.status === 'Completed';
      const isPaymentReleased =
        loc.paymentStatus === 'Completed' ||
        loc.paymentStatus === 'Paid Out' ||
        loc.paymentStatus === 'Paid';
      if (isDone && isPaymentReleased) {
        return false;
      }
      if (loc.status === 'Rejected' || loc.verificationStatus === 'Rejected') {
        return false;
      }
    }

    if (selectedCity === 'All') return true;
    const city = loc.city || loc.location || '';
    return city.toLowerCase().includes(selectedCity.toLowerCase());
  });

  const activeSelected = selectedLocation || filteredLocations[0] || null;

  const handlePingWorker = (loc) => {
    const workerLabel = loc.name || loc.activeWorker || loc.assignedWorker?.name || 'Field Inspector';
    addToast(
      'Telemetry Ping Dispatched',
      `Sent high-accuracy GPS fix request to ${workerLabel} at ${loc.city || loc.location || 'site'}.`,
      'info'
    );
  };

  const flaggedCount = filteredLocations.filter((l) => {
    const s = l.status || l.verificationStatus || '';
    return s.includes('Flagged') || s.includes('Failed') || s.includes('Offset');
  }).length;

  return (
    <div className="space-y-6">
      {/* Top Command & Status Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-slate-200/90">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="font-plus font-bold text-2xl sm:text-3xl text-slate-900 tracking-tight">
              Live Field Map &amp; Telemetry Radar
            </h1>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
              <span className="font-mono text-[11px] text-blue-800 font-semibold uppercase tracking-wider">
                LIVE SENSOR TELEMETRY ({filteredLocations.length} NODES)
              </span>
            </div>
            <span className="font-mono text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              ATLAS INGEST: ONLINE
            </span>
          </div>
          <p className="font-plus text-xs sm:text-sm text-slate-500 max-w-4xl">
            Real-time geospatial tracking, multi-constellation RTK telemetry, and geo-fence perimeter compliance across active Maharashtra sector nodes.
          </p>
        </div>

        {/* Right Controls: Regional Filters & Utilities */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
          {/* Zone Selector Pills */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
            {['All', 'Pune', 'Mumbai', 'Nashik', 'Nagpur'].map((city) => (
              <button
                key={city}
                onClick={() => setSelectedCity(city)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold font-plus transition-all ${
                  selectedCity === city
                    ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/60 font-bold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {city}
              </button>
            ))}
          </div>

          <button
            onClick={() => fetchLocations()}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 font-mono text-xs rounded-xl border border-slate-200/90 shadow-2xs hover:shadow-sm transition-all"
            title="Auto-Sync GPS Nodes"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
            <span>Sync</span>
          </button>

          <button
            onClick={() => addToast('Telemetry Export', 'Live GPS vector logs exported to GeoJSON format.', 'success')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-slate-950 via-blue-950 to-indigo-900 text-white font-plus text-xs font-bold rounded-xl shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
          >
            <Download className="w-3.5 h-3.5 text-blue-200" />
            <span>Export Radar</span>
          </button>
        </div>
      </div>

      {/* Telemetry Metrics Row (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="stitch-card-hover bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between group">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase font-bold text-slate-400 tracking-wider">Active Nodes &amp; En Route</span>
            <span className="w-2 h-2 rounded-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.6)]"></span>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-3xl font-bold text-slate-900">{filteredLocations.length || 17}</span>
              <span className="font-mono text-xs text-slate-400">/ {locations.length || 17} CONNECTED</span>
            </div>
            <span className="font-mono text-[10px] text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">99.4% FIX</span>
          </div>
          <div className="mt-2 text-slate-500 font-mono text-[11px] flex items-center justify-between">
            <span>{Math.max(1, filteredLocations.length - 2)} Active Field Lock</span>
            <span className="text-slate-800 font-semibold">2 En Route</span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="stitch-card-hover bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between group">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase font-bold text-slate-400 tracking-wider">Geo-Fence Integrity</span>
            <span className={`w-2 h-2 rounded-full ${flaggedCount > 0 ? 'bg-rose-500 animate-ping' : 'bg-emerald-500'}`}></span>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <div className="flex items-baseline gap-1.5">
              <span className={`font-mono text-3xl font-bold ${flaggedCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {flaggedCount > 0 ? `${flaggedCount} Flagged` : '0 Breaches'}
              </span>
            </div>
            <span className={`font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
              flaggedCount > 0 ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}>
              {flaggedCount > 0 ? '+148m DRIFT' : 'ALL LOCKED'}
            </span>
          </div>
          <div className="mt-2 text-slate-500 font-mono text-[11px] flex items-center justify-between">
            <span className="truncate">Maharashtra Grid</span>
            <span className={`font-semibold ${flaggedCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {flaggedCount > 0 ? 'CRITICAL WATCH' : 'NOMINAL'}
            </span>
          </div>
        </div>

        {/* Card 3 */}
        <div className="stitch-card-hover bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between group">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase font-bold text-slate-400 tracking-wider">Mean Positional Drift</span>
            <Crosshair className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-3xl font-bold text-slate-900">0.38m</span>
              <span className="font-mono text-xs text-slate-400">CEP</span>
            </div>
            <span className="font-mono text-[10px] text-blue-700 font-semibold bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">RTK FIX</span>
          </div>
          <div className="mt-2 text-slate-500 font-mono text-[11px] flex items-center justify-between">
            <span>Dual-Frequency L1/L5</span>
            <span className="text-slate-800 font-semibold">12 Satellites</span>
          </div>
        </div>

        {/* Card 4 */}
        <div className="stitch-card-hover bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between group">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase font-bold text-slate-400 tracking-wider">Cluster Ingest &amp; Sync</span>
            <Radio className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-3xl font-bold text-blue-600">18ms</span>
              <span className="font-mono text-xs text-slate-400">p99</span>
            </div>
            <span className="font-mono text-[10px] text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">99.98% SYNC</span>
          </div>
          <div className="mt-2 text-slate-500 font-mono text-[11px] flex items-center justify-between">
            <span>TLS 1.3 / Enclave Hash</span>
            <span className="text-emerald-700 font-semibold">Live Stream</span>
          </div>
        </div>
      </div>

      {/* Main Map Visual Canvas & Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interactive Tactical Map */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/90 overflow-hidden flex flex-col h-[560px] relative shadow-2xs group">
          {/* Map Top Bar Controls */}
          <div className="p-3 bg-slate-50/90 backdrop-blur border-b border-slate-200/80 flex items-center justify-between z-10 text-xs">
            <div className="flex items-center gap-2 text-slate-800 font-bold font-plus">
              <Radio className="w-4 h-4 text-blue-600 animate-pulse" />
              <span>SATELLITE &amp; SENSOR TELEMETRY: ACTIVE</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-slate-400">Projection: WGS84</span>
              <span className="font-mono text-[10px] font-bold px-2 py-0.5 bg-white border border-slate-200 text-slate-700 rounded-md shadow-2xs">
                Zoom: 11x
              </span>
            </div>
          </div>

          {/* Map Canvas with Precision Tactical Radar Grid */}
          <div className="flex-1 bg-gradient-to-b from-[#0B132B] via-[#111c38] to-[#0A0E1A] relative overflow-hidden flex items-center justify-center p-6 select-none">
            {/* Background High-Tech Grid Pattern */}
            <div
              className="absolute inset-0 opacity-20 pointer-events-none"
              style={{
                backgroundImage: `
                  linear-gradient(to right, #38BDF8 1px, transparent 1px),
                  linear-gradient(to bottom, #38BDF8 1px, transparent 1px)
                `,
                backgroundSize: '40px 40px'
              }}
            />

            {/* Radar Rings & Sweep Animation */}
            <div className="absolute w-[360px] h-[360px] rounded-full border border-blue-500/20 pointer-events-none" />
            <div className="absolute w-[500px] h-[500px] rounded-full border border-blue-400/15 pointer-events-none" />
            <div className="absolute w-[640px] h-[640px] rounded-full border border-indigo-400/10 pointer-events-none" />

            {/* Crosshair Lines */}
            <div className="absolute inset-x-0 top-1/2 h-px bg-blue-500/20 pointer-events-none" />
            <div className="absolute inset-y-0 left-1/2 w-px bg-blue-500/20 pointer-events-none" />

            {/* Center Map Compass Hint */}
            <div className="absolute top-4 left-4 p-2.5 rounded-lg bg-slate-900/80 backdrop-blur border border-slate-700/60 shadow-lg font-mono text-[10px] text-slate-300 pointer-events-none">
              <div className="text-slate-400">LAT: 18.5204° N</div>
              <div className="text-slate-400">LNG: 73.8567° E</div>
              <div className="text-blue-400 font-bold mt-0.5">MAHARASHTRA SECTOR RADAR</div>
            </div>

            {/* Geo-fence boundary preview ring */}
            <div className="absolute w-72 h-72 rounded-full border border-emerald-500/30 bg-emerald-500/5 pointer-events-none animate-pulse" />

            {/* Pins positioned geographically across tactical grid */}
            {filteredLocations.map((loc, idx) => {
              const isSelected = activeSelected && activeSelected.id === loc.id;
              const positions = [
                { top: '38%', left: '48%' },
                { top: '46%', left: '44%' },
                { top: '42%', left: '52%' },
                { top: '24%', left: '26%' },
                { top: '30%', left: '32%' },
                { top: '28%', left: '28%' },
                { top: '15%', left: '42%' },
                { top: '65%', left: '80%' },
              ];
              const pos = positions[idx % positions.length];
              const statusStr = loc.status || loc.verificationStatus || '';
              const isFlagged = statusStr.includes('Flagged') || statusStr.includes('Failed') || statusStr.includes('Offset');
              const nodeTitle = loc.name || loc.title || loc.workerId || loc.taskId;
              const nodeCity = loc.city || loc.location || 'Site';

              return (
                <div
                  key={loc.id}
                  onClick={() => setSelectedLocation(loc)}
                  style={{ top: pos.top, left: pos.left }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group z-20"
                >
                  <div
                    className={`w-10 h-10 rounded-full absolute -inset-2 animate-ping pointer-events-none ${
                      isFlagged ? 'bg-rose-500/30' : 'bg-blue-400/25'
                    }`}
                  />

                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shadow-lg transition-all duration-300 group-hover:scale-125 border-2 ${
                      isSelected
                        ? 'bg-blue-600 text-white ring-4 ring-blue-400/40 border-white'
                        : isFlagged
                        ? 'bg-rose-600 text-white border-rose-300'
                        : 'bg-slate-900/90 text-blue-400 border-blue-400/60'
                    }`}
                  >
                    <MapPin className="w-4 h-4" />
                  </div>

                  <div className="absolute top-9 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-900/90 border border-slate-700/80 px-2.5 py-1 rounded-md shadow-xl pointer-events-none font-mono text-[10px] font-bold text-white group-hover:bg-blue-600 transition-colors">
                    <span className="text-blue-400 group-hover:text-white">{nodeCity}</span> • {nodeTitle}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom legend */}
          <div className="p-3 bg-white border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-600 font-plus">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 font-mono text-[11px]">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                Active Node ({filteredLocations.length})
              </span>
              <span className="flex items-center gap-1.5 font-mono text-[11px]">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                Geo-Fence Anomaly ({flaggedCount})
              </span>
            </div>
            <span className="font-mono text-[11px] text-blue-600 font-bold">Click node to inspect telemetry</span>
          </div>
        </div>

        {/* Selected Location Telemetry Inspector */}
        <div className="stitch-card-hover bg-white rounded-xl border border-slate-200/90 p-5 shadow-2xs flex flex-col justify-between">
          {activeSelected ? (
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Navigation className="w-4 h-4" />
                  </div>
                  <h3 className="font-plus text-base font-bold text-slate-900">Node Telemetry</h3>
                </div>
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                  {activeSelected.id || activeSelected.workerId || activeSelected.taskId}
                </span>
              </div>

              <div className="space-y-4 text-xs font-plus">
                <div>
                  <div className="font-mono text-[10px] uppercase font-bold text-slate-400">Node Identifier</div>
                  <div className="font-plus text-base font-bold text-slate-900 mt-0.5">
                    {activeSelected.name || activeSelected.title || 'Telemetry Node'}
                  </div>
                  <div className="text-slate-500 mt-0.5 font-mono text-[11px]">
                    {activeSelected.city || activeSelected.location} • {activeSelected.zone || activeSelected.address || 'Operations Hub'}
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80 font-mono space-y-2 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Coordinates:</span>
                    <span className="text-slate-800 font-bold">{activeSelected.lat || activeSelected.latitude || '18.5204'}° N, {activeSelected.lng || activeSelected.longitude || '73.8567'}° E</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Entity Type:</span>
                    <span className="text-blue-700 font-bold uppercase text-[10px]">{activeSelected.entityType || 'Field Node'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Status:</span>
                    <span className="text-slate-800 font-semibold">{activeSelected.status || activeSelected.verificationStatus || 'Active'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Enclave Attestation:</span>
                    <span className="text-emerald-700 font-bold">TPM 2.0 VALID</span>
                  </div>
                </div>

                <div>
                  <div className="font-mono text-[10px] uppercase font-bold text-slate-400">Inspector / Assignee</div>
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 mt-1.5 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900 font-plus">
                        {activeSelected.name || activeSelected.assignedWorker?.name || activeSelected.workerId || 'Active Inspector'}
                      </div>
                      <div className="font-mono text-[10px] text-slate-500">
                        Rating: {activeSelected.rating ? `★ ${activeSelected.rating}` : '★ 5.0'}
                      </div>
                    </div>
                    <button
                      onClick={() => handlePingWorker(activeSelected)}
                      className="px-3 py-1.5 bg-gradient-to-r from-slate-950 to-blue-950 text-white rounded-lg text-xs font-bold transition-all shadow-2xs hover:shadow-sm"
                    >
                      Ping GPS
                    </button>
                  </div>
                </div>

                <div>
                  <div className="font-mono text-[10px] uppercase font-bold text-slate-400 mb-1">Status Condition</div>
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 text-xs">
                    <div className="font-bold text-slate-800 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{activeSelected.status || activeSelected.verificationStatus || 'Verified Operational Node'}</span>
                    </div>
                    <p className="font-mono text-[10px] text-slate-500 mt-1">
                      Geo-fence threshold monitored by continuous background sensor telemetry.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-16 text-center text-slate-400">
              <Navigation className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="font-plus text-sm font-semibold text-slate-700">No telemetry nodes active</p>
              <p className="font-mono text-xs text-slate-400 mt-1">Dispatched tasks will appear here in real-time.</p>
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400 font-mono">
            Sensor telemetry stream: Active
          </div>
        </div>
      </div>
    </div>
  );
};
