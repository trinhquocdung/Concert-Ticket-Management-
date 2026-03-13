import React from 'react';
import { Check, ChevronRight } from 'lucide-react';
import { useCart } from '../context/CartContext.jsx';
import { useNavigate } from 'react-router-dom';

const ProcessBar = ({ current = 'order' }) => {
  const steps = [
    { key: 'order', label: 'Select seats' },
    { key: 'fill', label: 'Fill info' },
    { key: 'pay', label: 'Payment' },
  ];

  const { hasItems } = useCart();
  const navigate = useNavigate();

  const isCompleted = (key) => {
    if (key === 'order') return hasItems;
    // fill is considered completed only when user reaches or finishes it (handled by page logic)
    // For now do not mark fill as completed automatically
    return false;
  };

  const currentIndex = steps.findIndex((s) => s.key === current);

  const goToStep = (key) => {
    if (!key) return;
    // only allow navigation to previous steps
    const targetIndex = steps.findIndex((s) => s.key === key);
    if (targetIndex >= currentIndex) return;

    if (key === 'order') {
      // try to get last event id from session storage or cart
      try {
        const last = sessionStorage.getItem('fill_last_event') || (() => { const raw = sessionStorage.getItem('purchase_progress'); if (!raw) return null; const p = JSON.parse(raw); return p?.eventId; })();
        if (last) {
          navigate(`/order/${last}`);
          return;
        }
      } catch (e) {}
      navigate(-1);
      return;
    }

    if (key === 'fill') {
      navigate('/fillinfo');
      return;
    }

    if (key === 'pay') {
      navigate('/payment');
      return;
    }
  };

  return (
    <div className="w-full bg-gray-800 rounded p-2 mb-2">
      <div className="flex items-center justify-center max-w-3xl mx-auto gap-2">
        {steps.map((s, idx) => {
          const clickable = idx < currentIndex;
          return (
            <React.Fragment key={s.key}>
              <div className="text-center">
                <button
                  onClick={() => clickable && goToStep(s.key)}
                  disabled={!clickable}
                  className={`inline-flex items-center justify-center gap-2 px-3 py-1 rounded-full text-sm font-medium focus:outline-none ${
                    current === s.key ? 'bg-indigo-500 text-white' : 'bg-gray-700 text-gray-200 border border-gray-600'
                  } ${clickable ? 'cursor-pointer hover:scale-105 transition' : 'cursor-default'}`}
                >
                  {isCompleted(s.key) && (
                    <Check size={14} className="text-white opacity-90" />
                  )}
                  <span>{s.label}</span>
                </button>
              </div>

              {idx < steps.length - 1 && (
                <div className="text-gray-500">
                  <ChevronRight size={16} />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default ProcessBar;
