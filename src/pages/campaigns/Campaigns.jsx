import { useState } from "react";
import { Link } from "react-router-dom";

export default function Campaigns() {
  const [activeTab, setActiveTab] = useState("campaigns"); // "campaigns" | "segments" | "whatsapp"
  const [showNewCampaignModal, setShowNewCampaignModal] = useState(false);
  const [campaignTitle, setCampaignTitle] = useState("");
  const [selectedSegment, setSelectedSegment] = useState("all");
  const [campaignMessage, setCampaignMessage] = useState("");
  const [toast, setToast] = useState("");

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  };

  const stats = [
    { label: "Total Campaigns", val: "14", change: "+3 this month", color: "#075BFF" },
    { label: "Messages Delivered", val: "12,480", change: "99.2% rate", color: "#22C55E" },
    { label: "Read Rate", val: "84.6%", change: "Industry top 5%", color: "#1687FF" },
    { label: "Store Conversions", val: "1,240", change: "+18.4% Sales", color: "#075BFF" },
  ];

  const campaigns = [
    {
      id: "CAMP-104",
      name: "Weekend Grocery Flash Sale 10% Off",
      segment: "VIP & Regular Customers",
      sent: 2450,
      delivered: 2432,
      read: 2180,
      status: "COMPLETED",
      date: "24 May 2026",
    },
    {
      id: "CAMP-103",
      name: "Udhar / Kadan Gentle Balance Reminder",
      segment: "Customers with Kadan > ₹500",
      sent: 180,
      delivered: 178,
      read: 165,
      status: "COMPLETED",
      date: "20 May 2026",
    },
    {
      id: "CAMP-102",
      name: "New Basmati Rice & Oil Batch Arrival",
      segment: "All Registered Customers",
      sent: 3800,
      delivered: 3760,
      read: 3120,
      status: "COMPLETED",
      date: "14 May 2026",
    },
  ];

  const segments = [
    { title: "VIP Shoppers", count: 240, spend: "₹24,500 avg", tag: "Top 10%" },
    { title: "Regular Customers", count: 890, spend: "₹8,200 avg", tag: "Bi-Weekly" },
    { title: "New This Month", count: 145, spend: "₹3,400 avg", tag: "First Visit" },
    { title: "Outstanding Kadan", count: 48, spend: "₹42,800 total", tag: "Pending Udhar" },
  ];

  const handleSendCampaign = (e) => {
    e.preventDefault();
    setShowNewCampaignModal(false);
    setCampaignTitle("");
    setCampaignMessage("");
    showToast("WhatsApp Campaign queued for broadcast!");
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
            WHATSAPP MARKETING & BROADCAST
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-[#102A56] tracking-tight mt-1.5">
            Customer Campaigns
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] mt-0.5">
            Engage shop regulars, announce offers, and send payment notices via verified WhatsApp.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowNewCampaignModal(true)}
          className="btn-primary text-xs sm:text-sm py-2.5 px-5 shadow-lg shadow-blue-500/20"
        >
          <span>+ Create Campaign</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {stats.map((s) => (
          <div key={s.label} className="white-card white-card-hover p-5">
            <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">{s.label}</span>
            <p className="text-2xl font-black text-[#102A56] mt-2 tracking-tight">{s.val}</p>
            <p className="text-xs font-semibold text-[#22C55E] mt-1">{s.change}</p>
          </div>
        ))}
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-2">
        {[
          { key: "campaigns", label: "Broadcast Campaigns" },
          { key: "segments", label: "Customer Segments" },
          { key: "whatsapp", label: "WhatsApp Gateway Status" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === tab.key
                ? "bg-[#075BFF] text-white shadow-xs"
                : "text-[#64748B] hover:text-[#102A56] hover:bg-slate-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Campaigns */}
      {activeTab === "campaigns" && (
        <div className="white-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-extrabold text-[#102A56]">Recent Broadcasts</h2>
            <span className="text-xs text-[#64748B]">Showing {campaigns.length} campaigns</span>
          </div>

          <div className="divide-y divide-slate-100">
            {campaigns.map((camp) => (
              <div key={camp.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#102A56]">{camp.name}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-[#22C55E]">
                      {camp.status}
                    </span>
                  </div>
                  <p className="text-xs text-[#64748B]">
                    Target: <strong className="text-[#102A56]">{camp.segment}</strong> · Sent on {camp.date}
                  </p>
                </div>

                <div className="flex items-center gap-6 text-xs text-right">
                  <div>
                    <span className="text-[#64748B] block text-[10px]">Delivered</span>
                    <span className="font-bold text-[#102A56]">{camp.delivered} / {camp.sent}</span>
                  </div>
                  <div>
                    <span className="text-[#64748B] block text-[10px]">Read Rate</span>
                    <span className="font-bold text-[#075BFF]">{Math.round((camp.read / camp.delivered) * 100)}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Segments */}
      {activeTab === "segments" && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          {segments.map((seg) => (
            <div key={seg.title} className="white-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EAF3FF] text-[#075BFF]">
                  {seg.tag}
                </span>
                <span className="text-xs text-[#64748B] font-bold">{seg.count} Customers</span>
              </div>
              <h3 className="text-base font-extrabold text-[#102A56]">{seg.title}</h3>
              <p className="text-xs text-[#64748B]">Average monthly spend: <strong className="text-[#102A56]">{seg.spend}</strong></p>
              <button
                type="button"
                onClick={() => {
                  setSelectedSegment(seg.title);
                  setShowNewCampaignModal(true);
                }}
                className="btn-secondary w-full text-xs py-2 mt-2"
              >
                Broadcast to Segment →
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Tab 3: WhatsApp Center */}
      {activeTab === "whatsapp" && (
        <div className="white-card p-6 space-y-4">
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
            <span className="w-3 h-3 rounded-full bg-[#22C55E] animate-pulse" />
            <div>
              <h4 className="text-xs font-bold text-emerald-900">WhatsApp Cloud POS Channel Active</h4>
              <p className="text-[11px] text-emerald-700">Digital receipts and reminder templates are operating with zero delivery queue delay.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <span className="text-xs font-bold text-[#64748B]">Receipt Engine</span>
              <p className="text-sm font-bold text-[#102A56] mt-1">Automatic on Checkout</p>
              <p className="text-[11px] text-[#22C55E] mt-0.5">Instant delivery</p>
            </div>
            <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <span className="text-xs font-bold text-[#64748B]">Kadan Reminder</span>
              <p className="text-sm font-bold text-[#102A56] mt-1">1-Click WhatsApp Balance</p>
              <p className="text-[11px] text-[#075BFF] mt-0.5">Pre-filled with UPI link</p>
            </div>
            <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <span className="text-xs font-bold text-[#64748B]">Broadcast Quota</span>
              <p className="text-sm font-bold text-[#102A56] mt-1">Unlimited Messages</p>
              <p className="text-[11px] text-[#22C55E] mt-0.5">Fair usage policy</p>
            </div>
          </div>
        </div>
      )}

      {/* New Campaign Modal */}
      {showNewCampaignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-[#E2E8F0] p-6 shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-extrabold text-base text-[#102A56]">Create WhatsApp Broadcast</h3>
              <button onClick={() => setShowNewCampaignModal(false)} className="text-slate-400 p-1">✕</button>
            </div>

            <form onSubmit={handleSendCampaign} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#102A56] mb-1">Campaign Title *</label>
                <input
                  type="text"
                  value={campaignTitle}
                  onChange={(e) => setCampaignTitle(e.target.value)}
                  placeholder="e.g. Festive Discount 10% on Edible Oils"
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#102A56] mb-1">Target Customer Segment</label>
                <select
                  value={selectedSegment}
                  onChange={(e) => setSelectedSegment(e.target.value)}
                  className="input-field cursor-pointer"
                >
                  <option value="all">All Registered Customers</option>
                  <option value="VIP Shoppers">VIP Shoppers (Top 10%)</option>
                  <option value="Regular Customers">Regular Weekly Shoppers</option>
                  <option value="Outstanding Kadan">Customers with Pending Kadan</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#102A56] mb-1">WhatsApp Message Body *</label>
                <textarea
                  rows={4}
                  value={campaignMessage}
                  onChange={(e) => setCampaignMessage(e.target.value)}
                  placeholder="Dear customer, special discount this weekend at your favorite store..."
                  className="input-field resize-none"
                  required
                />
              </div>

              <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 text-xs text-[#102A56]">
                Message will be sent using Cryvex ShopFlow's verified business channel with shop name branding.
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewCampaignModal(false)}
                  className="btn-secondary flex-1 text-xs py-2.5"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1 text-xs py-2.5">
                  Launch Broadcast 🚀
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
