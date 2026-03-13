import React from 'react';
import { CreditCard, ShieldCheck, ChevronRight, Tag, Ticket } from 'lucide-react';

const MoMoCheckout = ({ 
  items, // extra `items` prop: list of tickets
  subtotal, 
  discountAmount, 
  finalTotal, 
  voucherCode, 
  onApplyVoucher, 
  onVoucherChange,
  onConfirm, 
  loading,
  isValidating
}) => {
  return (
    <div className="max-w-md mx-auto bg-gray-900 rounded-3xl overflow-hidden shadow-2xl border border-gray-800">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-600 to-purple-700 p-6 text-white text-center">
        <div className="flex justify-center mb-2">
          <div className="bg-white p-2 rounded-2xl shadow-lg">
            <img 
              src="https://cdn.haitrieu.com/wp-content/uploads/2022/10/Logo-MoMo-Square.png" 
              alt="MoMo" 
              className="w-10 h-10"
            />
          </div>
        </div>
        <h2 className="text-xl font-bold">Pay with MoMo</h2>
      </div>

      <div className="p-6 space-y-6">
        {/* --- TICKET DETAILS SECTION (ADDED) --- */}
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase mb-3 block tracking-widest">Ticket Info</label>
          <div className="space-y-3">
            {items && items.map((item, idx) => (
              <div key={idx} className="flex gap-3 bg-gray-800/30 p-3 rounded-2xl border border-gray-700/50">
                <div className="bg-pink-500/10 p-2 rounded-xl flex items-center justify-center">
                  <Ticket className="text-pink-500" size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-white truncate">{item.eventTitle}</div>
                    <div className="text-[11px] text-gray-400 mt-0.5">
                    {item.ticketClassName} • {item.seats?.length || item.quantity} tickets
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Voucher Section */}
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">Voucher code</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Tag className="absolute left-3 top-2.5 text-gray-500" size={16} />
              <input
                type="text"
                placeholder="ENTERCODE20"
                value={voucherCode}
                onChange={(e) => onVoucherChange(e.target.value.toUpperCase())}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-3 py-2 text-white focus:ring-2 focus:ring-pink-500 outline-none transition"
              />
            </div>
            <button
              onClick={onApplyVoucher}
              disabled={isValidating || !voucherCode}
              className="bg-gray-800 hover:bg-gray-700 text-pink-500 px-4 py-2 rounded-xl font-bold text-sm border border-gray-700 transition disabled:opacity-50"
            >
              {isValidating ? '...' : 'Apply'}
            </button>
          </div>
        </div>

        {/* Bill Details */}
        <div className="bg-gray-800/50 rounded-2xl p-4 space-y-3">
          <div className="flex justify-between text-gray-400 text-sm">
            <span>Subtotal</span>
            <span className="text-gray-200">{subtotal.toLocaleString()} VND</span>
          </div>
          
          {discountAmount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-pink-400 font-medium">Discount</span>
              <span className="text-pink-400">-{discountAmount.toLocaleString()} VND</span>
            </div>
          )}
          
          <div className="pt-3 border-t border-gray-700 flex justify-between items-end">
            <span className="text-gray-200 font-bold">Total</span>
            <div className="text-right">
              <div className="text-2xl font-black text-white leading-none">
                {finalTotal.toLocaleString()} VND
              </div>
              <div className="text-[10px] text-gray-500 uppercase mt-1">Includes VAT</div>
            </div>
          </div>
        </div>

        {/* Security Note */}
        <div className="flex items-center gap-3 bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10">
          <ShieldCheck className="text-emerald-500" size={20} />
          <p className="text-[11px] text-gray-400 leading-tight">
            Payment information is encrypted securely to PCI DSS standards.
          </p>
        </div>

        {/* Action Button */}
        <button
          onClick={onConfirm}
          disabled={loading}
          className="w-full bg-pink-600 hover:bg-pink-500 active:scale-[0.98] py-4 rounded-2xl text-white font-black shadow-lg shadow-pink-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 group"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              CONNECTING...
            </div>
          ) : (
            <>
              CONFIRM PAYMENT
              <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default MoMoCheckout;