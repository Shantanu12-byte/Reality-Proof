import React from 'react';
import { HelpCircle, BookOpen, Terminal, Shield, ExternalLink, MessageSquare } from 'lucide-react';
import { useTaskContext } from '../context/TaskContext';

export const HelpPage = () => {
  const { addToast } = useTaskContext();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[#EEF2F6]">
        <div>
          <h1 className="font-reckless text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
            Help & Knowledge Base
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Operational runbooks, roadmap specifications and system architecture references.
          </p>
        </div>

        <button
          onClick={() => addToast('Support Ticket Created', 'Enterprise operational engineering team notified.', 'info')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-[#E2E8F0] text-xs font-bold transition-all shadow-2xs hover:shadow-sm"
        >
          <MessageSquare className="w-4 h-4 text-[#6C5DD3]" />
          <span>Contact Operations Support</span>
        </button>
      </div>

      {/* Guide Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="card-surface rounded-2xl p-5 text-xs card-hover">
          <div className="w-10 h-10 rounded-2xl bg-purple-50 text-[#6C5DD3] flex items-center justify-center mb-3">
            <BookOpen className="w-5 h-5" />
          </div>
          <h3 className="font-reckless text-xl font-bold text-slate-900 mb-1">Field Task Workflow</h3>
          <p className="text-slate-500 leading-relaxed font-medium mb-3">
            Learn how tasks are created, dispatched to registered inspectors, geotagged on site and routed to the multi-layer vision engine.
          </p>
          <span className="font-sans font-bold text-[#6C5DD3] text-xs hover:underline cursor-pointer">Read Field SOP →</span>
        </div>

        <div className="card-surface rounded-2xl p-5 text-xs card-hover">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
            <Shield className="w-5 h-5" />
          </div>
          <h3 className="font-reckless text-xl font-bold text-slate-900 mb-1">AI Anti-Fraud Verification</h3>
          <p className="text-slate-500 leading-relaxed font-medium mb-3">
            Deep dive into perceptual hash matching (pHash), EXIF hardware sensor heuristics, and moiré screen-recapture detection.
          </p>
          <span className="font-sans font-bold text-emerald-700 text-xs hover:underline cursor-pointer">Security Whitepaper →</span>
        </div>

        <div className="card-surface rounded-2xl p-5 text-xs card-hover">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
            <Terminal className="w-5 h-5" />
          </div>
          <h3 className="font-reckless text-xl font-bold text-slate-900 mb-1">Backend Roadmap</h3>
          <p className="text-slate-500 leading-relaxed font-medium mb-3">
            Specs for connecting this frontend foundation to the Node.js Express server, PyTorch GPU inference worker and PayPal Payouts API.
          </p>
          <span className="font-sans font-bold text-blue-700 text-xs hover:underline cursor-pointer">View Backend Spec →</span>
        </div>
      </div>

      {/* Architecture Overview */}
      <div className="card-surface rounded-2xl p-6 text-xs card-hover">
        <h3 className="font-reckless text-xl font-bold text-slate-900 mb-2">Phase 1 Architecture Foundation</h3>
        <p className="text-slate-600 leading-relaxed font-medium mb-4">
          This dashboard foundation is built with React, Vite, Tailwind CSS, React Router, Lucide Icons and Recharts. All task dispatches, state updates, metric recalculations and audit exceptions operate synchronously in frontend state, designed for direct drop-in connection to RESTful endpoints in Phase 2.
        </p>

        <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#EEF2F6] font-mono text-xs text-slate-700 space-y-1.5 font-semibold">
          <div>REST Base: <span className="text-[#6C5DD3]">/api/v1/tasks</span></div>
          <div>Inference Base: <span className="text-emerald-700">/api/v1/inference/verify</span></div>
          <div>PayPal Webhooks: <span className="text-blue-700">/api/v1/payments/paypal/webhook</span></div>
        </div>
      </div>
    </div>
  );
};
