import React, { useState, useEffect } from 'react';
import { CreditCard, DollarSign, Clock, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { paymentApi } from '../../services/api';
import { useTaskContext } from '@/context/TaskContext';

export const PaymentOverview = () => {
  const { tasks } = useTaskContext();
  const [summary, setSummary] = useState({
    escrowBalance: 0,
    pendingPayouts: 0,
    completedPayouts: 0,
    pendingCount: 0,
    completedCount: 0,
  });

  useEffect(() => {
    let isMounted = true;
    const fetchSummary = async () => {
      try {
        const data = await paymentApi.getSummary();
        if (isMounted && data) {
          setSummary(data);
        }
      } catch (err) {
        console.warn('[RealityProof] Payment overview sync notice:', err.message);
      }
    };
    fetchSummary();
    return () => {
      isMounted = false;
    };
  }, [tasks]);

  const escrowDisplay = `$${summary.escrowBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const paidDisplay = `$${summary.completedPayouts.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="card-surface rounded-2xl p-5 sm:p-6 card-hover flex flex-col justify-between">
      <div className="flex items-center justify-between pb-3 border-b border-[#F1F4F9] mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-50 text-[#6C5DD3] flex items-center justify-center">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-reckless text-xl font-bold text-slate-900 tracking-tight">Payment Escrow</h3>
            <p className="text-xs text-slate-500 font-medium">PayPal pre-authorization holds and automated release pipeline</p>
          </div>
        </div>
        <Link
          to="/payments"
          className="text-xs text-[#6C5DD3] hover:text-purple-700 flex items-center gap-1 font-bold transition-colors"
        >
          <span>Ledger</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3.5">
        <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#EEF2F6]">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            Escrow Pending Release
          </div>
          <div className="font-reckless text-2xl font-bold text-slate-900 mt-1">
            {escrowDisplay}
          </div>
          <div className="text-[11px] text-amber-600 font-medium mt-0.5">
            {summary.pendingCount} tasks held
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-100">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            Captured This Cycle
          </div>
          <div className="font-reckless text-2xl font-bold text-emerald-700 mt-1">
            {paidDisplay}
          </div>
          <div className="text-[11px] text-emerald-600 font-medium mt-0.5">
            {summary.completedCount} payouts settled
          </div>
        </div>
      </div>

      <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#EEF2F6] text-xs space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-slate-500 font-medium flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            PayPal API Gateway:
          </span>
          <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 text-[11px]">
            Ready (Live API)
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-500 font-medium flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-[#6C5DD3]" />
            Escrow Release:
          </span>
          <span className="text-slate-800 font-semibold">Instant on Verification</span>
        </div>
      </div>
    </div>
  );
};
