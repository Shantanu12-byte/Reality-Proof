import React, { useState, useEffect, useRef } from 'react';
import { Lock, X, CheckCircle2, AlertTriangle, ExternalLink, Loader2, DollarSign } from 'lucide-react';
import { paymentApi } from '../../services/api';

/**
 * PayPal Authorize Modal using Official PayPal JavaScript SDK
 * Loads https://www.paypal.com/sdk/js dynamically with intent=authorize
 * and renders PayPal Buttons for task budget pre-authorization.
 */
export const PayPalAuthorizeModal = ({
  isOpen,
  onClose,
  taskId,
  taskTitle,
  amount,
  paymentId,
  onAuthorized,
}) => {
  const [config, setConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [orderId, setOrderId] = useState('');
  const [approvalUrl, setApprovalUrl] = useState('');
  const paypalButtonContainerRef = useRef(null);

  // Load public PayPal configuration from backend
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsLoading(true);
    setErrorMessage('');

    async function init() {
      try {
        const res = await paymentApi.getConfig();
        const cfg = res.data || res;
        if (isMounted) setConfig(cfg);

        // Pre-create the order
        if (taskId) {
          const orderRes = await paymentApi.createOrder(taskId);
          if (isMounted) {
            setOrderId(orderRes.orderId || '');
            setApprovalUrl(orderRes.approvalUrl || '');
          }
        }
      } catch (err) {
        if (isMounted) setErrorMessage(err.message || 'Failed to initialize PayPal order.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    init();
    return () => {
      isMounted = false;
    };
  }, [isOpen, taskId]);

  // Load PayPal JavaScript SDK script and render Buttons if client-id is configured
  useEffect(() => {
    if (!isOpen || isLoading || !config?.clientId || !orderId) return;

    const scriptId = 'paypal-js-sdk';
    let script = document.getElementById(scriptId);

    const currency = config.currency || 'USD';
    const sdkUrl = `https://www.paypal.com/sdk/js?client-id=${config.clientId}&intent=authorize&currency=${currency}`;

    const renderButtons = () => {
      if (window.paypal && paypalButtonContainerRef.current) {
        paypalButtonContainerRef.current.innerHTML = '';
        window.paypal
          .Buttons({
            style: {
              layout: 'vertical',
              color: 'gold',
              shape: 'rect',
              label: 'paypal',
              height: 42,
            },
            createOrder: async () => {
              return orderId;
            },
            onApprove: async (data) => {
              setIsProcessing(true);
              try {
                await paymentApi.authorize(paymentId || taskId, { orderId: data.orderID });
                if (onAuthorized) onAuthorized();
                onClose();
              } catch (authErr) {
                setErrorMessage(authErr.message || 'Authorization failed.');
              } finally {
                setIsProcessing(false);
              }
            },
            onError: (err) => {
              console.error('[PayPal JS SDK] Checkout error:', err);
              setErrorMessage('PayPal checkout encountered an error. Please retry.');
            },
            onCancel: () => {
              setErrorMessage('Payment authorization was cancelled.');
            },
          })
          .render(paypalButtonContainerRef.current);
      }
    };

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = sdkUrl;
      script.async = true;
      script.onload = renderButtons;
      script.onerror = () => {
        setErrorMessage('Failed to load PayPal JavaScript SDK.');
      };
      document.body.appendChild(script);
    } else {
      renderButtons();
    }
  }, [isOpen, isLoading, config?.clientId, orderId, paymentId, taskId, onAuthorized, onClose]);

  if (!isOpen) return null;

  const handleSimulateAuthorize = async () => {
    setIsProcessing(true);
    setErrorMessage('');
    try {
      await paymentApi.authorize(paymentId || taskId, { orderId: orderId || `ORDER-SIM-${Date.now()}` });
      if (onAuthorized) onAuthorized();
      onClose();
    } catch (err) {
      setErrorMessage(err.message || 'Simulation failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200/80 space-y-5 animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-[#6C5DD3] flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-reckless text-lg font-bold text-slate-900">
                Authorize Task Budget
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                PayPal Orders v2 • intent: AUTHORIZE
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Task Summary */}
        <div className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-slate-100 text-xs space-y-1.5">
          <div className="flex justify-between">
            <span className="text-slate-500">Task Reference:</span>
            <strong className="text-slate-900 font-mono">{taskId}</strong>
          </div>
          {taskTitle && (
            <div className="flex justify-between">
              <span className="text-slate-500">Task Title:</span>
              <span className="text-slate-700 font-medium truncate max-w-[180px]">{taskTitle}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-slate-500">Pre-Authorization Hold:</span>
            <strong className="text-emerald-700 font-mono text-sm">
              ${(typeof amount === 'number' ? amount : parseFloat(amount) || 35).toFixed(2)} USD
            </strong>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Validity Window:</span>
            <span className="text-purple-700 font-medium">29 Days Hold</span>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* PayPal SDK Button Container or Sandbox Setup */}
        {isLoading ? (
          <div className="py-8 text-center text-xs text-slate-400 space-y-2">
            <Loader2 className="w-6 h-6 mx-auto animate-spin text-[#6C5DD3]" />
            <p>Connecting to PayPal Sandbox REST v2 API...</p>
          </div>
        ) : config?.clientId ? (
          <div className="space-y-3">
            <p className="text-[11px] text-slate-500 text-center font-medium">
              Click below to complete authorization using the official PayPal JavaScript SDK.
            </p>
            <div ref={paypalButtonContainerRef} className="min-h-[120px]" />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-[11px] text-amber-900 space-y-2">
              <div className="font-bold flex items-center gap-1.5 text-amber-800">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>PayPal Sandbox Mode Active</span>
              </div>
              <p className="leading-relaxed">
                To test with live PayPal buttons, add your sandbox credentials in <strong>backend/.env</strong>:
              </p>
              <pre className="p-2 rounded-xl bg-amber-100/70 font-mono text-[10px] overflow-x-auto text-amber-950">
PAYPAL_MODE=sandbox
PAYPAL_CLIENT_ID=your_client_id
PAYPAL_CLIENT_SECRET=your_secret
              </pre>
            </div>

            {/* Simulation button for local development */}
            <button
              type="button"
              onClick={handleSimulateAuthorize}
              disabled={isProcessing}
              className="w-full py-3 px-4 rounded-2xl bg-[#6C5DD3] hover:bg-[#5A4CBF] text-white text-xs font-bold shadow-md shadow-purple-500/25 flex items-center justify-center gap-2"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              <span>Simulate Sandbox Authorization</span>
            </button>
          </div>
        )}

        {/* Explanatory Note */}
        <p className="text-[10px] text-slate-400 text-center leading-relaxed">
          <strong>Important:</strong> Pre-authorization places a hold on funds. Funds are captured only after physical evidence passes verification approval.
        </p>
      </div>
    </div>
  );
};

