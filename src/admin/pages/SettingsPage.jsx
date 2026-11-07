import React, { useState } from 'react';
import { Settings, Shield, Sliders, Bell, Key, Save, CheckCircle2 } from 'lucide-react';
import { useTaskContext } from '@/context/TaskContext';

export const SettingsPage = () => {
  const { addToast } = useTaskContext();
  const [activeTab, setActiveTab] = useState('verification');
  const [autoVerifyThreshold, setAutoVerifyThreshold] = useState(90);
  const [mockGpsStrict, setMockGpsStrict] = useState(true);
  const [autoReleasePayout, setAutoReleasePayout] = useState(true);
  const [webhookUrl, setWebhookUrl] = useState('https://api.realityproof.internal/webhooks/v1/inferences');

  const handleSave = (e) => {
    e.preventDefault();
    addToast('Configuration Saved', 'System operational thresholds and gateway settings updated.', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[#EEF2F6]">
        <div>
          <h1 className="font-reckless text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
            System Settings & Config
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Configure AI verification decision boundaries, PayPal escrow settings and operational webhooks.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#6C5DD3] hover:bg-[#5A4CBF] text-white text-xs font-bold tracking-tight shadow-md shadow-purple-500/25 transition-all duration-200 hover:-translate-y-0.5"
        >
          <Save className="w-3.5 h-3.5" />
          <span>Save Changes</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-3 border-b border-[#EEF2F6] text-xs">
        <button
          onClick={() => setActiveTab('verification')}
          className={`pb-3 px-3 font-bold border-b-2 transition-all ${
            activeTab === 'verification'
              ? 'border-[#6C5DD3] text-[#6C5DD3]'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          AI Verification Parameters
        </button>
        <button
          onClick={() => setActiveTab('paypal')}
          className={`pb-3 px-3 font-bold border-b-2 transition-all ${
            activeTab === 'paypal'
              ? 'border-[#6C5DD3] text-[#6C5DD3]'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          PayPal Gateway & Escrow
        </button>
        <button
          onClick={() => setActiveTab('webhooks')}
          className={`pb-3 px-3 font-bold border-b-2 transition-all ${
            activeTab === 'webhooks'
              ? 'border-[#6C5DD3] text-[#6C5DD3]'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          Webhooks & Alerts
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'verification' && (
        <div className="card-surface rounded-2xl p-6 space-y-6 text-xs card-hover">
          <div>
            <h3 className="font-reckless text-xl font-bold text-slate-900 mb-1">
              Automated Verification Confidence Boundary
            </h3>
            <p className="text-slate-500 font-medium mb-4">
              Submissions scoring at or above this threshold will automatically verify without requiring human queue triage.
            </p>
            <div className="flex items-center gap-5 max-w-md">
              <input
                type="range"
                min="70"
                max="99"
                value={autoVerifyThreshold}
                onChange={(e) => setAutoVerifyThreshold(Number(e.target.value))}
                className="w-full accent-[#6C5DD3] cursor-pointer"
              />
              <span className="font-reckless text-2xl font-bold text-[#6C5DD3] shrink-0">
                {autoVerifyThreshold}%
              </span>
            </div>
          </div>

          <div className="pt-5 border-t border-[#EEF2F6] flex items-start justify-between gap-4">
            <div>
              <div className="font-bold text-slate-900 text-sm">Strict Mock GPS & Anti-Spoofing Interlock</div>
              <p className="text-slate-500 mt-0.5 font-medium">
                Automatically reject submissions from devices running mock location apps or developer coordinate injections.
              </p>
            </div>
            <input
              type="checkbox"
              checked={mockGpsStrict}
              onChange={(e) => setMockGpsStrict(e.target.checked)}
              className="w-5 h-5 rounded-lg text-[#6C5DD3] focus:ring-0 cursor-pointer accent-[#6C5DD3]"
            />
          </div>
        </div>
      )}

      {activeTab === 'paypal' && (
        <div className="card-surface rounded-2xl p-6 space-y-5 text-xs card-hover">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">PayPal Client ID</label>
              <input
                type="text"
                readOnly
                value="AY2k9J0-qW9e4L_SANDBOX_MOCK_884920491823"
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-slate-500 font-mono font-medium"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">Gateway Environment</label>
              <input
                type="text"
                readOnly
                value="Sandbox Mode (Phase 1 Simulation)"
                className="w-full bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 text-emerald-700 font-bold"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-[#EEF2F6] flex items-start justify-between gap-4">
            <div>
              <div className="font-bold text-slate-900 text-sm">Automatic Payout Release on AI Pass</div>
              <p className="text-slate-500 mt-0.5 font-medium">
                Automatically execute PayPal Payouts API payload immediately when task reaches Verified status.
              </p>
            </div>
            <input
              type="checkbox"
              checked={autoReleasePayout}
              onChange={(e) => setAutoReleasePayout(e.target.checked)}
              className="w-5 h-5 rounded-lg text-[#6C5DD3] focus:ring-0 cursor-pointer accent-[#6C5DD3]"
            />
          </div>
        </div>
      )}

      {activeTab === 'webhooks' && (
        <div className="card-surface rounded-2xl p-6 space-y-4 text-xs card-hover">
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">Operational Event Webhook URL</label>
            <input
              type="text"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-slate-900 font-mono font-medium focus:outline-none focus:border-[#6C5DD3] focus:bg-white"
            />
            <p className="text-slate-500 text-[11px] mt-1.5 font-medium">
              RealityProof dispatches webhook payloads for all verified, flagged or escrow released events.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
