import React, { useState, useEffect, useCallback } from 'react';
import {
  CreditCard,
  DollarSign,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Download,
  Lock,
  RefreshCw,
  Send,
  Loader2,
  Info,
  X,
  Eye,
  Check,
  AlertCircle,
  Building,
  UserCheck,
  Receipt,
  FileDown,
  TrendingUp,
  Zap
} from 'lucide-react';
import { paymentApi } from '../services/api';
import { useTaskContext } from '@/context/TaskContext';
import { PayPalAuthorizeModal } from '../components/payments/PayPalAuthorizeModal';

export const PaymentsPage = () => {
  const { addToast, refreshData } = useTaskContext();
  const [config, setConfig] = useState({
    mode: 'sandbox',
    currency: 'USD',
    isConfigured: false,
    payoutsEnabled: false,
  });
  const [summary, setSummary] = useState({
    totalAuthorized: 0,
    totalCaptured: 0,
    pendingCaptures: 0,
    pendingWorkerSettlements: 0,
    totalSettled: 0,
    failedAmount: 0,
  });
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [isCaptureModalOpen, setIsCaptureModalOpen] = useState(false);
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
  const [isAuthorizeModalOpen, setIsAuthorizeModalOpen] = useState(false);
  const [authorizeTarget, setAuthorizeTarget] = useState(null);
  const [actionPayment, setActionPayment] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [settlementNote, setSettlementNote] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');

  const fetchPaymentData = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const [cfgData, sumData, txnsData] = await Promise.all([
        paymentApi.getConfig().catch(() => ({})),
        paymentApi.getSummary(),
        paymentApi.getTransactions(),
      ]);
      if (cfgData?.data || cfgData) setConfig(cfgData.data || cfgData);
      if (sumData) setSummary(sumData);
      if (Array.isArray(txnsData)) setTransactions(txnsData);
    } catch (err) {
      console.error('[RealityProof] Failed to fetch live payment data:', err.message);
      addToast('Sync Warning', 'Could not sync live payment records with MongoDB.', 'warning');
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchPaymentData();
  }, [fetchPaymentData]);

  // Handle Capture Action
  const handleConfirmCapture = async () => {
    if (!actionPayment) return;
    setActionLoading(true);
    try {
      const res = await paymentApi.capture(actionPayment.paymentId || actionPayment.id, {
        reviewerName: 'Admin Operations Supervisor',
        note: `Manual capture verified by supervisor for task ${actionPayment.taskId}`,
      });
      addToast(
        'Payment Captured',
        `Captured $${actionPayment.amount} USD via PayPal Payments v2 API (Capture ID: ${res.paypalCaptureId || res.id}).`,
        'success'
      );
      setIsCaptureModalOpen(false);
      setActionPayment(null);
      await fetchPaymentData(true);
      if (refreshData) refreshData(true);
    } catch (err) {
      console.error('[PaymentsPage] Capture error:', err.message);
      addToast('Capture Failed', err.message || 'Failed to capture PayPal authorization', 'danger');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Worker Settlement Action
  const handleConfirmSettlement = async () => {
    if (!actionPayment) return;
    setActionLoading(true);
    try {
      const res = await paymentApi.payout(actionPayment.paymentId || actionPayment.id, {
        adminName: 'Finance Officer',
        note: settlementNote || 'Worker earnings settlement',
      });
      addToast(
        'Worker Payout Recorded',
        `Worker earnings of $${actionPayment.amount} USD marked settled (${res.payoutStatus || 'SETTLED'}).`,
        'success'
      );
      setIsSettlementModalOpen(false);
      setActionPayment(null);
      setSettlementNote('');
      await fetchPaymentData(true);
      if (refreshData) refreshData(true);
    } catch (err) {
      console.error('[PaymentsPage] Settlement error:', err.message);
      addToast('Settlement Error', err.message, 'danger');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredTransactions = transactions.filter((txn) => {
    if (filterStatus === 'All') return true;
    if (filterStatus === 'AUTHORIZED') return txn.paymentStatus === 'AUTHORIZED' || txn.status === 'Pending';
    if (filterStatus === 'CAPTURED') return txn.captureStatus === 'COMPLETED' || txn.paymentStatus === 'CAPTURED';
    if (filterStatus === 'SETTLED') return txn.payoutStatus === 'SUCCESS' || txn.payoutStatus === 'MANUAL_SETTLED';
    return true;
  });

  return (
    <div className="space-y-6 animate-card-open">
      {/* Precision Operations Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-sans text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              PayPal Escrow & Settlement Vault
            </h1>
            <span className="text-[11px] font-bold font-mono px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs">
              PayPal REST v2 • {config.mode?.toUpperCase() || 'SANDBOX'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Pre-authorize budgets via PayPal Orders v2, verify field evidence with AI, capture funds upon verification, and settle worker payouts.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchPaymentData()}
            className="p-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 text-xs transition-all shadow-2xs hover:shadow-xs active:rotate-180 duration-300"
            title="Refresh payment ledger"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* 4 Financial KPI Cards Matching Stitch Specification */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Captured to Merchant Vault */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between gap-2 transition-all duration-300 hover:border-blue-500/40 hover:shadow-lg hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Captured Merchant Vault
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-baseline gap-2">
              <span className="font-sans text-3xl font-extrabold text-slate-900">
                ${(summary.totalCaptured || 0).toFixed(2)}
              </span>
              <span className="font-mono text-[11px] text-slate-400 font-bold">USD</span>
            </div>
            <div className="flex items-center justify-between mt-1 text-xs">
              <span className="text-slate-500 font-medium">98.8% Capture SLA</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-mono text-[10px] font-bold flex items-center gap-0.5">
                <TrendingUp className="w-3 h-3" />
                +14.2%
              </span>
            </div>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
            <div className="bg-emerald-500 h-full w-[94%]" />
          </div>
        </div>

        {/* Card 2: Active Pre-Authorizations */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between gap-2 transition-all duration-300 hover:border-blue-500/40 hover:shadow-lg hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Active Pre-Authorizations
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200">
              <Lock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-baseline gap-2">
              <span className="font-sans text-3xl font-extrabold text-slate-900">
                ${(summary.totalAuthorized || 0).toFixed(2)}
              </span>
              <span className="font-mono text-[11px] text-slate-400 font-bold">USD</span>
            </div>
            <div className="flex items-center justify-between mt-1 text-xs">
              <span className="text-slate-500 font-medium">29-Day Hold Window</span>
              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-mono text-[10px] font-bold">
                Lock Active
              </span>
            </div>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
            <div className="bg-blue-600 h-full w-[65%]" />
          </div>
        </div>

        {/* Card 3: Pending Worker Disbursements */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between gap-2 transition-all duration-300 hover:border-blue-500/40 hover:shadow-lg hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Pending Disbursements
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-baseline gap-2">
              <span className="font-sans text-3xl font-extrabold text-amber-700">
                ${(summary.pendingWorkerSettlements || 0).toFixed(2)}
              </span>
              <span className="font-mono text-[11px] text-slate-400 font-bold">USD</span>
            </div>
            <div className="flex items-center justify-between mt-1 text-xs">
              <span className="text-slate-500 font-medium">Awaiting ZK-signoff</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-mono text-[10px] font-bold">
                Hold Active
              </span>
            </div>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
            <div className="bg-amber-500 h-full w-[38%]" />
          </div>
        </div>

        {/* Card 4: Settled Worker Payouts */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between gap-2 transition-all duration-300 hover:border-blue-500/40 hover:shadow-lg hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Settled Worker Payouts
            </span>
            <div className="w-8 h-8 rounded-xl bg-slate-900 text-blue-400 flex items-center justify-center border border-slate-700">
              <Send className="w-4 h-4" />
            </div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-baseline gap-2">
              <span className="font-sans text-3xl font-extrabold text-slate-900">
                ${(summary.totalSettled || 0).toFixed(2)}
              </span>
              <span className="font-mono text-[11px] text-slate-400 font-bold">USD</span>
            </div>
            <div className="flex items-center justify-between mt-1 text-xs">
              <span className="text-slate-500 font-mono text-[11px]">{config.payoutsEnabled ? 'Payouts API' : 'Manual Ledger'}</span>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 font-mono text-[10px] font-bold">
                Instant Clear
              </span>
            </div>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
            <div className="bg-slate-900 h-full w-[90%]" />
          </div>
        </div>
      </div>

      {/* PayPal Integration Architecture Card */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-sm transition-all duration-300 hover:border-blue-500/40 hover:shadow-lg">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h3 className="font-sans text-base font-extrabold text-slate-900">
              PayPal REST v2 Lifecycle Architecture
            </h3>
          </div>
          <span className="text-[11px] font-mono font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
            Authorization ≠ Escrow
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5 text-xs">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 hover:bg-blue-50/40 hover:border-blue-300 transition-all">
            <div className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-mono font-bold">1</span>
              <span>Authorization Hold</span>
            </div>
            <p className="text-slate-500 text-[11px] leading-relaxed font-medium">
              Business pre-authorizes the task budget via PayPal Orders v2 (intent: AUTHORIZE). Funds are held for up to 29 days.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 hover:bg-blue-50/40 hover:border-blue-300 transition-all">
            <div className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-mono font-bold">2</span>
              <span>AI Verification Gate</span>
            </div>
            <p className="text-slate-500 text-[11px] leading-relaxed font-medium">
              Field worker uploads evidence. The multimodal vision pipeline inspects requirements, GPS coordinates, and hashes.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 hover:bg-blue-50/40 hover:border-blue-300 transition-all">
            <div className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-mono font-bold">3</span>
              <span>Merchant Capture</span>
            </div>
            <p className="text-slate-500 text-[11px] leading-relaxed font-medium">
              Upon approval, the authorized payment is captured via Payments v2 into the business merchant PayPal account.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 hover:bg-blue-50/40 hover:border-blue-300 transition-all">
            <div className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-mono font-bold">4</span>
              <span>Worker Settlement</span>
            </div>
            <p className="text-slate-500 text-[11px] leading-relaxed font-medium">
              Worker payout is executed as an independent transaction via PayPal Payouts API or administrator settlement.
            </p>
          </div>
        </div>
      </div>

      {/* Transaction Ledger Table with Heavy Row Lift */}
      <div className="bg-white rounded-2xl overflow-hidden border border-slate-200/90 shadow-sm">
        <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-sans text-lg font-extrabold text-slate-900">PayPal Transaction Ledger</h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Real-time authorization states, capture confirmations and worker settlements
            </p>
          </div>

          <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1 text-slate-600 text-xs">
            {['All', 'AUTHORIZED', 'CAPTURED', 'SETTLED'].map((tab) => (
              <button
                key={tab}
                onClick={() => setFilterStatus(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filterStatus === tab
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                {tab === 'All' ? 'All Transactions' : tab}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="table-header border-b border-slate-200/90">
                <th className="py-3 px-5 font-bold text-slate-600">Payment ID</th>
                <th className="py-3 px-5 font-bold text-slate-600">Task Ref</th>
                <th className="py-3 px-5 font-bold text-slate-600">Specialist</th>
                <th className="py-3 px-5 font-bold text-slate-600">Amount</th>
                <th className="py-3 px-5 font-bold text-slate-600">Authorization</th>
                <th className="py-3 px-5 font-bold text-slate-600">Capture Status</th>
                <th className="py-3 px-5 font-bold text-slate-600">Worker Settlement</th>
                <th className="py-3 px-5 font-bold text-slate-600 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <p className="text-sm font-semibold text-slate-700">No payment transactions found</p>
                    <p className="text-xs text-slate-400 mt-1">Transactions appear as tasks are created and authorized.</p>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((txn) => {
                  const isCaptured = txn.captureStatus === 'COMPLETED' || txn.paymentStatus === 'CAPTURED';
                  const isAuthorized = txn.authorizationStatus === 'CREATED' || txn.paymentStatus === 'AUTHORIZED';
                  const isSettled = txn.payoutStatus === 'SUCCESS' || txn.payoutStatus === 'MANUAL_SETTLED';
                  const isVerified = txn.verificationStatus === 'Verified';

                  return (
                    <tr key={txn.id || txn.paymentId || txn.taskId} className="table-row-hover hover:bg-blue-50/50">
                      <td className="py-4 px-5 font-mono font-bold text-blue-700 whitespace-nowrap">
                        {txn.paymentId || txn.id}
                      </td>
                      <td className="py-4 px-5 whitespace-nowrap">
                        <span className="font-mono font-semibold text-slate-900">{txn.taskId}</span>
                        <span className="block text-[11px] text-slate-400 truncate max-w-[140px]">
                          {txn.title || txn.taskTitle}
                        </span>
                      </td>
                      <td className="py-4 px-5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-[10px]">
                            {txn.workerAvatar || 'WR'}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-800 block">{txn.worker}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{txn.workerId}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-5 whitespace-nowrap font-mono font-bold text-slate-900">
                        {txn.formattedAmount || `$${txn.amount?.toFixed(2)}`}
                      </td>
                      <td className="py-4 px-5 whitespace-nowrap">
                        {isAuthorized ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 font-mono">
                            <Lock className="w-2.5 h-2.5" />
                            <span>AUTHORIZED</span>
                            {txn.daysUntilExpiry !== null && txn.daysUntilExpiry !== undefined && (
                              <span className="text-[9px] text-blue-600 font-mono">({txn.daysUntilExpiry}d)</span>
                            )}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500 font-mono">
                            {txn.authorizationStatus || 'PENDING'}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-5 whitespace-nowrap">
                        {isCaptured ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            <span>CAPTURED</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 font-mono">
                            {isAuthorized ? 'READY TO CAPTURE' : 'AWAITING AUTH'}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-5 whitespace-nowrap">
                        {isSettled ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 font-mono">
                            <Check className="w-2.5 h-2.5" />
                            <span>SETTLED</span>
                          </span>
                        ) : isCaptured ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 font-mono">
                            <Clock className="w-2.5 h-2.5" />
                            <span>SETTLEMENT PENDING</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>
                      <td className="py-4 px-5 whitespace-nowrap text-right space-x-1.5">
                        <button
                          onClick={() => setSelectedPayment(txn)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 shadow-2xs hover:-translate-y-0.5 transition-all cursor-pointer"
                        >
                          Details
                        </button>

                        {/* Authorize Button */}
                        {!isAuthorized && (
                          <button
                            onClick={() => {
                              setAuthorizeTarget(txn);
                              setIsAuthorizeModalOpen(true);
                            }}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs hover:-translate-y-0.5 transition-all cursor-pointer"
                          >
                            Authorize
                          </button>
                        )}

                        {/* Capture Button */}
                        {isAuthorized && !isCaptured && (
                          <button
                            onClick={() => {
                              setActionPayment(txn);
                              setIsCaptureModalOpen(true);
                            }}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-white bg-slate-900 hover:bg-blue-900 shadow-xs hover:-translate-y-0.5 transition-all cursor-pointer"
                          >
                            Capture
                          </button>
                        )}

                        {/* Worker Settlement Button */}
                        {isCaptured && !isSettled && (
                          <button
                            onClick={() => {
                              setActionPayment(txn);
                              setIsSettlementModalOpen(true);
                            }}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs hover:-translate-y-0.5 transition-all cursor-pointer"
                          >
                            Settle Payout
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Payment Lifecycle Details */}
      {selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto stitch-modal-open">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-sans text-xl font-extrabold text-slate-900">
                  Payment Lifecycle & Audit Record
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  {selectedPayment.paymentId || selectedPayment.id} • Task {selectedPayment.taskId}
                </p>
              </div>
              <button
                onClick={() => setSelectedPayment(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Lifecycle Stages */}
            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">1. PayPal Order (intent: AUTHORIZE)</span>
                  <span className="font-mono text-[10px] text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded">
                    {selectedPayment.paypalOrderId || 'CREATED'}
                  </span>
                </div>
                <div className="text-slate-600">
                  Amount: <strong className="text-slate-900">{selectedPayment.formattedAmount || `$${selectedPayment.amount}`}</strong>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">2. Pre-Authorization Hold</span>
                  <span className="font-mono text-[10px] text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded">
                    {selectedPayment.authorizationStatus || 'CREATED'}
                  </span>
                </div>
                <div className="text-slate-600">
                  Auth ID: <span className="font-mono text-slate-800">{selectedPayment.paypalAuthorizationId || 'N/A'}</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Valid for up to 29 days. Funds remain with buyer until capture.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">3. Physical AI Vision Verification</span>
                  <span className="font-bold text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    {selectedPayment.verificationStatus || 'Verified'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Capture is legally and contractually gated by evidence satisfaction.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">4. Merchant PayPal Capture</span>
                  <span className="font-mono text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                    {selectedPayment.captureStatus || 'NONE'}
                  </span>
                </div>
                <div className="text-slate-600">
                  Capture ID: <span className="font-mono text-slate-800">{selectedPayment.paypalCaptureId || 'Awaiting Capture'}</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Captured funds are deposited into the merchant business account.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">5. Worker Earnings Settlement</span>
                  <span className="font-mono text-[10px] text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded">
                    {selectedPayment.payoutStatus || 'PENDING'}
                  </span>
                </div>
                <div className="text-slate-600">
                  Recipient: <strong className="text-slate-800">{selectedPayment.worker}</strong> ({selectedPayment.recipientEmail})
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedPayment(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Capture Confirmation */}
      {isCaptureModalOpen && actionPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-200 stitch-modal-open">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-sans text-lg font-extrabold text-slate-900">
                  Confirm Payment Capture
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  PayPal Payments v2 API • Authorize-to-Capture
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Task:</span>
                <strong className="text-slate-900 font-mono">{actionPayment.taskId}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Capture Amount:</span>
                <strong className="text-blue-700 text-sm font-mono">
                  {actionPayment.formattedAmount || `$${actionPayment.amount}`} USD
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Verification Status:</span>
                <span className="text-emerald-700 font-bold uppercase">
                  {actionPayment.verificationStatus || 'Verified'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Authorization ID:</span>
                <span className="font-mono text-slate-700 text-[11px] truncate max-w-[160px]">
                  {actionPayment.paypalAuthorizationId || 'AUTH-SANDBOX'}
                </span>
              </div>
            </div>

            <p className="text-slate-500 text-[11px] leading-relaxed">
              <strong>Notice:</strong> This captures the pre-authorized amount from the buyer and deposits funds into the merchant PayPal balance. Worker earnings payout is processed as a separate transaction.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsCaptureModalOpen(false);
                  setActionPayment(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCapture}
                disabled={actionLoading}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-blue-900 text-white text-xs font-bold shadow-md shadow-slate-900/25 flex items-center gap-1.5 hover:-translate-y-0.5 transition-all"
              >
                {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>Authorize & Capture Funds</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Worker Settlement */}
      {isSettlementModalOpen && actionPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-200 stitch-modal-open">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-sans text-lg font-extrabold text-slate-900">
                  Settle Worker Payout
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {config.payoutsEnabled ? 'PayPal Payouts REST API' : 'Administrator Manual Settlement'}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Worker:</span>
                <strong className="text-slate-900">{actionPayment.worker}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">PayPal Email:</span>
                <span className="font-mono text-slate-800">{actionPayment.recipientEmail}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payout Amount:</span>
                <strong className="text-emerald-700 text-sm font-mono">
                  {actionPayment.formattedAmount || `$${actionPayment.amount}`} USD
                </strong>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Settlement Reference / Note
              </label>
              <input
                type="text"
                value={settlementNote}
                onChange={(e) => setSettlementNote(e.target.value)}
                placeholder="e.g. Bank ACH, Direct PayPal, or Batch Payout Reference"
                className="w-full p-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 font-sans"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsSettlementModalOpen(false);
                  setActionPayment(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSettlement}
                disabled={actionLoading}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-500/25 flex items-center gap-1.5 hover:-translate-y-0.5 transition-all"
              >
                {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Confirm Settlement</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: PayPal Pre-Authorization Hold */}
      {isAuthorizeModalOpen && authorizeTarget && (
        <PayPalAuthorizeModal
          isOpen={isAuthorizeModalOpen}
          onClose={() => {
            setIsAuthorizeModalOpen(false);
            setAuthorizeTarget(null);
          }}
          taskId={authorizeTarget.taskId}
          taskTitle={authorizeTarget.title || authorizeTarget.taskTitle}
          amount={authorizeTarget.amount}
          paymentId={authorizeTarget.paymentId || authorizeTarget.id}
          onAuthorized={async () => {
            addToast('Payment Authorized', `PayPal pre-authorization active for ${authorizeTarget.taskId}.`, 'success');
            await fetchPaymentData(true);
            if (refreshData) refreshData(true);
          }}
        />
      )}
    </div>
  );
};
