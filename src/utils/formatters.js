export const formatCurrency = (amount) => {
  if (typeof amount === 'number') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  }
  return amount;
};

export const getStatusBadgeStyle = (status) => {
  switch (status) {
    case 'Verified':
    case 'Completed':
    case 'Active':
    case 'Operational':
      return {
        bg: 'bg-emerald-50/90',
        text: 'text-emerald-700',
        border: 'border-emerald-200/90',
        dot: 'bg-emerald-500',
      };
    case 'Review Required':
    case 'Manual Review Hold':
    case 'Under Review':
    case 'High':
    case 'Pending':
    case 'In Progress':
      return {
        bg: 'bg-amber-50/90',
        text: 'text-amber-700',
        border: 'border-amber-200/90',
        dot: 'bg-amber-500',
      };
    case 'Rejected':
      return {
        bg: 'bg-slate-100',
        text: 'text-slate-700',
        border: 'border-slate-300',
        dot: 'bg-slate-500',
      };
    case 'Failed':
    case 'Critical':
    case 'Suspended (Review)':
    case 'Declined (Failed Check)':
    case 'Not Eligible':
      return {
        bg: 'bg-rose-50/90',
        text: 'text-rose-700',
        border: 'border-rose-200/90',
        dot: 'bg-rose-500',
      };
    case 'Warning':
      return {
        bg: 'bg-orange-50/90',
        text: 'text-orange-700',
        border: 'border-orange-200/90',
        dot: 'bg-orange-500',
      };
    default:
      return {
        bg: 'bg-purple-50/90',
        text: 'text-purple-700',
        border: 'border-purple-200/90',
        dot: 'bg-purple-500',
      };
  }
};

export const getSeverityBadgeStyle = (severity) => {
  switch (severity?.toLowerCase()) {
    case 'critical':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    case 'high':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'warning':
    case 'medium':
      return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'low':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
};
