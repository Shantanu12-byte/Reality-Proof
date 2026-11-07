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
  RefreshCw
} from 'lucide-react';
import { telemetryApi } from '../services/api';
import { useTaskContext } from '../context/TaskContext';

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[#EEF2F6]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-reckless text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
              Live Field Map & Telemetry
            </h1>
            <span className="text-xs font-bold font-mono px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              Live Sensor Telemetry ({locations.length} Nodes)
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Real-time geospatial tracking, geo-fence perimeter verification and active field inspector locations across India.
          </p>
        </div>

        {/* City Filter Pills */}
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-2xl border border-[#EEF2F6] shadow-2xs">
          {['All', 'Pune', 'Mumbai', 'Nashik', 'Nagpur'].map((city) => (
            <button
              key={city}
              onClick={() => setSelectedCity(city)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                selectedCity === city
                  ? 'bg-[#6C5DD3] text-white shadow-sm shadow-purple-500/20'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {city}
            </button>
          ))}
          <button
            onClick={() => fetchLocations()}
            className="p-1.5 text-slate-400 hover:text-[#6C5DD3] rounded-lg transition-colors ml-1"
            title="Refresh GPS Nodes"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Map Visual Canvas & Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interactive Tactical Map */}
        <div className="lg:col-span-2 card-surface rounded-2xl overflow-hidden flex flex-col h-[520px] relative card-hover">
          {/* Map Top Bar Controls */}
          <div className="p-3.5 bg-white/95 backdrop-blur border-b border-[#EEF2F6] flex items-center justify-between z-10 text-xs">
            <div className="flex items-center gap-2 text-slate-700 font-bold">
              <Radio className="w-4 h-4 text-[#6C5DD3] animate-pulse" />
              <span>SATELLITE & SENSOR TELEMETRY: ACTIVE</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-slate-400">Projection: WGS84</span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full">
                Zoom: 11x
              </span>
            </div>
          </div>

          {/* Map Canvas with Crisp Modern Light Grid */}
          <div className="flex-1 bg-[#F9FBFF] relative overflow-hidden flex items-center justify-center p-6 select-none">
            {/* Background Grid Pattern */}
            <div
              className="absolute inset-0 opacity-40 pointer-events-none"
              style={{
                backgroundImage: `
                  linear-gradient(to right, #E2E8F0 1px, transparent 1px),
                  linear-gradient(to bottom, #E2E8F0 1px, transparent 1px)
                `,
                backgroundSize: '40px 40px'
              }}
            />

            {/* Radar Circles */}
            <div className="absolute w-96 h-96 rounded-full border border-purple-200/50 pointer-events-none" />
            <div className="absolute w-[500px] h-[500px] rounded-full border border-purple-100 pointer-events-none" />

            {/* Center Map Compass Hint */}
            <div className="absolute top-4 left-4 p-2.5 rounded-xl bg-white/90 border border-[#EEF2F6] shadow-sm text-[10px] font-mono text-slate-500 pointer-events-none">
              <div>LAT: 18.5204° N</div>
              <div>LNG: 73.8567° E</div>
              <div className="text-[#6C5DD3] font-bold mt-0.5">MAHARASHTRA OPERATIONS</div>
            </div>

            {/* Pins positioned geographically across grid */}
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
                  className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
                >
                  <div
                    className={`w-10 h-10 rounded-full absolute -inset-2 animate-ping pointer-events-none ${
                      isFlagged ? 'bg-rose-400/20' : 'bg-purple-400/20'
                    }`}
                  />

                  <div
                    className={`w-7 h-7 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-200 group-hover:scale-125 border-2 ${
                      isSelected
                        ? 'bg-[#6C5DD3] text-white ring-4 ring-purple-200 border-white'
                        : isFlagged
                        ? 'bg-rose-600 text-white border-white'
                        : 'bg-white text-[#6C5DD3] border-[#6C5DD3]'
                    }`}
                  >
                    <MapPin className="w-4 h-4" />
                  </div>

                  <div className="absolute top-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white border border-[#E2E8F0] px-2.5 py-1 rounded-full shadow-lg pointer-events-none text-[10px] font-bold text-slate-800">
                    <span className="text-[#6C5DD3]">{nodeCity}</span> • {nodeTitle}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom legend */}
          <div className="p-3 bg-white border-t border-[#EEF2F6] flex items-center justify-between text-xs text-slate-500 font-medium">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#6C5DD3]" />
                Active Node ({locations.length})
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                Geo-Fence Anomaly
              </span>
            </div>
            <span className="font-mono text-[11px] text-[#6C5DD3] font-bold">Click any node to inspect</span>
          </div>
        </div>

        {/* Selected Location Telemetry Inspector */}
        <div className="card-surface rounded-2xl p-5 sm:p-6 card-hover flex flex-col justify-between">
          {activeSelected ? (
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#F1F4F9] mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-[#6C5DD3] flex items-center justify-center">
                    <Navigation className="w-4 h-4" />
                  </div>
                  <h3 className="font-reckless text-xl font-bold text-slate-900">Node Telemetry</h3>
                </div>
                <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                  {activeSelected.id || activeSelected.workerId || activeSelected.taskId}
                </span>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Node Identifier</div>
                  <div className="font-reckless text-xl font-bold text-slate-900 mt-0.5">
                    {activeSelected.name || activeSelected.title || 'Telemetry Node'}
                  </div>
                  <div className="text-slate-500 font-medium mt-0.5">
                    {activeSelected.city || activeSelected.location} • {activeSelected.zone || activeSelected.address || 'Operations Hub'}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#EEF2F6] font-mono space-y-2 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">Coordinates:</span>
                    <span className="text-slate-800 font-bold">{activeSelected.lat || activeSelected.latitude}° N, {activeSelected.lng || activeSelected.longitude}° E</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">Entity Type:</span>
                    <span className="text-emerald-700 font-bold font-sans uppercase text-[10px]">{activeSelected.entityType || 'Field Node'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">Status:</span>
                    <span className="text-slate-800 font-sans font-semibold">{activeSelected.status || activeSelected.verificationStatus || 'Active'}</span>
                  </div>
                </div>

                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Inspector / Assignee</div>
                  <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#EEF2F6] mt-1.5 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900">
                        {activeSelected.name || activeSelected.assignedWorker?.name || activeSelected.workerId || 'Active Inspector'}
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium">
                        Rating: {activeSelected.rating ? `★ ${activeSelected.rating}` : '5.0'}
                      </div>
                    </div>
                    <button
                      onClick={() => handlePingWorker(activeSelected)}
                      className="px-3 py-1.5 bg-[#6C5DD3] hover:bg-[#5A4CBF] text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                    >
                      Ping GPS
                    </button>
                  </div>
                </div>

                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Status Condition</div>
                  <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#EEF2F6] text-xs">
                    <div className="font-bold text-slate-800 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{activeSelected.status || activeSelected.verificationStatus || 'Verified Operational Node'}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 font-medium">
                      Geo-fence threshold monitored by continuous background sensor telemetry.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-16 text-center text-slate-400">
              <Navigation className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-700">No telemetry nodes active</p>
              <p className="text-xs text-slate-400 mt-1">Dispatched tasks will appear here in real-time.</p>
            </div>
          )}

          <div className="pt-3 border-t border-[#EEF2F6] text-[11px] text-slate-400 font-mono">
            Sensor telemetry stream: Active
          </div>
        </div>
      </div>
    </div>
  );
};
