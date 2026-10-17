import { useState } from "react";

export default function Reviews() {
  const [toast, setToast] = useState("");
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [customerPhone, setCustomerPhone] = useState("");

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  };

  const reviews = [
    {
      id: 1,
      author: "Pooja Sharma",
      rating: 5,
      date: "Today, 11:20 AM",
      comment: "Super fast checkout! Loved getting the receipt directly on my WhatsApp within seconds.",
      verified: true,
    },
    {
      id: 2,
      author: "Vikram Malhotra",
      rating: 5,
      date: "Yesterday",
      comment: "Clean billing. Always has items in stock and clear pricing on bills.",
      verified: true,
    },
    {
      id: 3,
      author: "Anil Deshmukh",
      rating: 4,
      date: "3 days ago",
      comment: "Good store experience. Convenient payment options with UPI QR on bill counter.",
      verified: true,
    },
  ];

  const handleSendReviewRequest = (e) => {
    e.preventDefault();
    setShowRequestModal(false);
    setCustomerPhone("");
    showToast("Review link sent via WhatsApp to customer!");
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-white border border-[#E2E8F0] shadow-2xl px-4 py-3 rounded-2xl flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-[#102A56] animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-[#E2E8F0] shadow-xs">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#075BFF] bg-[#EAF3FF] px-2.5 py-1 rounded-full border border-blue-100">
            CUSTOMER TRUST & RATINGS
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-[#102A56] tracking-tight mt-1.5">
            Customer Feedback & Reviews
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] mt-0.5">
            Collect verified Google & WhatsApp reviews automatically after every purchase.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowRequestModal(true)}
          className="btn-primary text-xs sm:text-sm py-2.5 px-5 shadow-lg shadow-blue-500/20"
        >
          <span>★ Request Review</span>
        </button>
      </div>

      {/* Top Rating Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4">
        <div className="white-card p-6 flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-500 flex flex-col items-center justify-center font-black shadow-xs">
            <span className="text-2xl leading-none">4.9</span>
            <span className="text-[10px]">★★★★★</span>
          </div>
          <div>
            <span className="text-xs font-bold text-[#64748B] uppercase">Average Store Rating</span>
            <p className="text-sm font-bold text-[#102A56] mt-0.5">Based on 148 verified ratings</p>
          </div>
        </div>

        <div className="white-card p-6 flex flex-col justify-center">
          <span className="text-xs font-bold text-[#64748B] uppercase">Total Reviews Received</span>
          <p className="text-2xl font-black text-[#102A56] mt-1">148</p>
          <span className="text-xs font-semibold text-[#22C55E] mt-0.5">96% Positive Feedback</span>
        </div>

        <div className="white-card p-6 flex flex-col justify-center">
          <span className="text-xs font-bold text-[#64748B] uppercase">Automated Requests Sent</span>
          <p className="text-2xl font-black text-[#102A56] mt-1">320</p>
          <span className="text-xs font-semibold text-[#075BFF] mt-0.5">Sent with digital invoices</span>
        </div>
      </div>

      {/* Reviews List */}
      <div className="white-card p-6 space-y-4">
        <h2 className="text-base font-extrabold text-[#102A56]">Recent Customer Reviews</h2>

        <div className="divide-y divide-slate-100">
          {reviews.map((rev) => (
            <div key={rev.id} className="py-4 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-[#102A56]">{rev.author}</h4>
                  {rev.verified && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-[#22C55E]">
                      ✓ Verified Shopper
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-[#64748B]">{rev.date}</span>
              </div>

              <div className="text-amber-400 text-xs">
                {"★".repeat(rev.rating)}
                {"☆".repeat(5 - rev.rating)}
              </div>

              <p className="text-xs text-[#64748B] leading-relaxed">{rev.comment}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Request Review Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-3xl border border-[#E2E8F0] p-6 shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-extrabold text-base text-[#102A56]">Send Review Request</h3>
              <button onClick={() => setShowRequestModal(false)} className="text-slate-400 p-1">✕</button>
            </div>

            <form onSubmit={handleSendReviewRequest} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#102A56] mb-1">Customer Mobile Number *</label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="10-digit mobile number"
                  className="input-field"
                  required
                />
              </div>

              <p className="text-xs text-[#64748B]">
                A polite review request with your store Google Maps link will be sent to the customer via WhatsApp.
              </p>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="btn-secondary flex-1 text-xs py-2.5"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1 text-xs py-2.5">
                  Send WhatsApp Invite ★
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
