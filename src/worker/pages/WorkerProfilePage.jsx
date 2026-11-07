import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  User,
  Star,
  Award,
  ShieldCheck,
  MapPin,
  Phone,
  Mail,
  DollarSign,
  CheckCircle2,
  LogOut,
  ArrowLeftRight,
  ChevronRight,
  Shield,
  Smartphone,
  Sparkles,
  ExternalLink,
  Users,
  Wallet,
  Zap,
  Lock,
  Cpu,
  Satellite
} from 'lucide-react';
import { useWorkerAuth } from '../auth/WorkerAuthContext';

export const WorkerProfilePage = () => {
  const { currentWorker, logout, demoWorkers, loginAsDemoWorker } = useWorkerAuth();
  const navigate = useNavigate();
  const [showSwitchModal, setShowSwitchModal] = useState(false);

  if (!currentWorker) return null;

  const handleLogout = () => {
    logout();
    navigate('/worker/login');
  };

  const handleSwitchWorker = async (workerId) => {
    setShowSwitchModal(false);
    await loginAsDemoWorker(workerId);
  };

  const initials = currentWorker.name
    ? currentWorker.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'WK';

  return (
    <div className="space-y-4 pb-12 animate-card-open">
      {/* Profile Card Header */}
      <div className="bg-surface-container-lowest rounded-xl p-5 sm:p-6 border border-outline-variant/30 shadow-sm relative overflow-hidden">
        {/* Background decorative ambient glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-start justify-between relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="relative">
              <div className="w-16 h-16 rounded-xl bg-primary-container text-on-primary flex items-center justify-center font-sans font-bold text-xl shadow-[0_0_16px_2px_rgba(108,93,211,0.35)]">
                {currentWorker.avatar || initials}
              </div>
              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-tertiary ring-2 ring-surface-container-lowest shadow-[0_0_8px_#007e56]" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold font-sans text-on-surface">
                  {currentWorker.name}
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-tertiary/10 text-tertiary border border-tertiary/30">
                  {currentWorker.status || 'Active Attestation'}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-mono text-xs font-bold text-primary bg-primary-fixed/40 px-2 py-0.5 rounded-full border border-primary/20">
                  {currentWorker.workerId}
                </span>
                <span className="text-xs text-outline-variant">•</span>
                <span className="text-xs text-on-surface-variant flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-secondary" />
                  {currentWorker.city}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowSwitchModal(true)}
            className="p-2.5 rounded-xl text-on-surface-variant hover:text-primary hover:bg-surface-container transition-all border border-outline-variant/30 active:scale-95 cursor-pointer shadow-xs"
            title="Switch demo inspector context"
          >
            <Users className="w-4 h-4" />
          </button>
        </div>

        {/* Rating and Accuracy Banner */}
        <div className="mt-5 grid grid-cols-2 gap-3 pt-4 border-t border-outline-variant/20">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-container-low border border-outline-variant/20">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-700 flex items-center justify-center shrink-0">
              <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                Telemetry Trust Score
              </div>
              <div className="text-sm font-bold text-on-surface">
                {currentWorker.rating ? currentWorker.rating.toFixed(1) : '5.0'} / 5.0
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-container-low border border-outline-variant/20">
            <div className="w-9 h-9 rounded-lg bg-primary-fixed text-primary flex items-center justify-center shrink-0">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                Verification Accuracy
              </div>
              <div className="text-sm font-bold text-on-surface">
                {currentWorker.accuracy ? `${currentWorker.accuracy}%` : '98.5%'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/30 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-on-surface-variant mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider">Completed Proofs</span>
            <CheckCircle2 className="w-4 h-4 text-tertiary" />
          </div>
          <div className="text-2xl font-bold font-sans text-on-surface">
            {currentWorker.completedJobs || currentWorker.tasksCompleted || 0}
          </div>
          <p className="text-[11px] text-on-surface-variant mt-0.5">Verified on-site attestations</p>
        </div>

        <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/30 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-on-surface-variant mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider">Settled Balance</span>
            <DollarSign className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-bold font-sans text-primary">
            ${typeof currentWorker.balance === 'number' ? currentWorker.balance.toFixed(2) : '0.00'}
          </div>
          <p className="text-[11px] text-tertiary mt-0.5 font-medium">Ready for PayPal withdrawal</p>
        </div>
      </div>

      {/* Hardware & Enclave Attestation Status */}
      <div className="bg-surface-container-lowest rounded-xl p-4 sm:p-5 border border-outline-variant/30 shadow-sm space-y-3">
        <h2 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-tertiary" />
          <span>Cryptographic Enclave Identity</span>
        </h2>

        <div className="space-y-2 font-mono text-[11px]">
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/20">
            <div className="flex items-center gap-2 text-on-surface-variant">
              <Cpu className="w-4 h-4 text-primary" />
              <span>Attestation Key Pair</span>
            </div>
            <span className="font-bold text-on-surface truncate max-w-[170px]">
              FIDO2-Ed25519-P256
            </span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/20">
            <div className="flex items-center gap-2 text-on-surface-variant">
              <Satellite className="w-4 h-4 text-secondary" />
              <span>GNSS Constellation Lock</span>
            </div>
            <span className="font-bold text-tertiary">
              14 Satellites • RTK Fix
            </span>
          </div>
        </div>
      </div>

      {/* Contact & Field Information */}
      <div className="bg-surface-container-lowest rounded-xl p-4 sm:p-5 border border-outline-variant/30 shadow-sm space-y-3">
        <h2 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
          Field Dispatch Details
        </h2>

        <div className="space-y-2.5">
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/20">
            <div className="flex items-center gap-2.5 text-xs text-on-surface-variant">
              <Mail className="w-4 h-4 text-on-surface-variant/70" />
              <span>Registered Email</span>
            </div>
            <span className="text-xs font-mono font-medium text-on-surface">
              {currentWorker.email}
            </span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/20">
            <div className="flex items-center gap-2.5 text-xs text-on-surface-variant">
              <Phone className="w-4 h-4 text-on-surface-variant/70" />
              <span>Contact Number</span>
            </div>
            <span className="text-xs font-mono font-medium text-on-surface">
              {currentWorker.phone || '+1 (555) 234-5678'}
            </span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/20">
            <div className="flex items-center gap-2.5 text-xs text-on-surface-variant">
              <MapPin className="w-4 h-4 text-on-surface-variant/70" />
              <span>Assigned Zone</span>
            </div>
            <span className="text-xs font-medium text-on-surface">
              {currentWorker.zone || `${currentWorker.city} Metro Core`}
            </span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/20">
            <div className="flex items-center gap-2.5 text-xs text-on-surface-variant">
              <ShieldCheck className="w-4 h-4 text-tertiary" />
              <span>Escrow Payout Status</span>
            </div>
            <span className="text-xs font-bold text-tertiary bg-tertiary/10 px-2 py-0.5 rounded border border-tertiary/30">
              {currentWorker.paypalStatus || 'Linked & Verified'}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation & App Actions */}
      <div className="bg-surface-container-lowest rounded-xl p-2 border border-outline-variant/30 shadow-sm space-y-1">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-error-container text-error transition-all group text-left cursor-pointer active:scale-98"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-error-container text-error flex items-center justify-center">
              <LogOut className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-error">
                Sign Out of Field Node
              </div>
              <div className="text-[11px] text-on-error-container">
                Clear enclave token and local session cache
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-error" />
        </button>
      </div>

      {/* Switch Demo Worker Modal */}
      {showSwitchModal && (
        <div className="fixed inset-0 z-50 bg-inverse-surface/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto border border-outline-variant/30">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
              <div>
                <h3 className="text-sm font-bold text-on-surface">Select Demo Field Inspector</h3>
                <p className="text-[11px] text-on-surface-variant">Switch context to test assigned task isolation</p>
              </div>
              <button
                onClick={() => setShowSwitchModal(false)}
                className="w-7 h-7 rounded-full bg-surface-container text-on-surface-variant hover:text-on-surface flex items-center justify-center text-xs font-mono font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              {demoWorkers.map((w) => {
                const isSelected = w.workerId === currentWorker.workerId;
                return (
                  <button
                    key={w.workerId}
                    onClick={() => handleSwitchWorker(w.workerId)}
                    className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'border-primary bg-primary-fixed/20 shadow-xs ring-1 ring-primary'
                        : 'border-outline-variant/30 hover:border-primary/40 hover:bg-surface-container-low'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-primary-container text-on-primary flex items-center justify-center font-bold text-xs">
                        {w.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                          <span>{w.name}</span>
                          <span className="font-mono text-[10px] text-primary bg-primary-fixed/40 px-1.5 py-0.2 rounded">
                            {w.workerId}
                          </span>
                        </div>
                        <div className="text-[11px] text-on-surface-variant">
                          {w.city} • Rating: {w.rating}★ • Accuracy: {w.accuracy}%
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <span className="text-[11px] font-bold text-primary bg-surface-container-lowest px-2 py-0.5 rounded-full border border-primary/20">
                        Active
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkerProfilePage;
