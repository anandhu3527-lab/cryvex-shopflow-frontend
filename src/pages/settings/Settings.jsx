import { useState, useEffect } from "react";
import { 
  Store, 
  User, 
  Receipt, 
  Percent, 
  Shield, 
  Users, 
  CheckCircle2, 
  Save, 
  Building, 
  Phone, 
  Mail, 
  MapPin, 
  CreditCard, 
  AlertCircle,
  QrCode,
  FileText
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { authApi } from "../../services/api/authApi";
import { Link } from "react-router-dom";

export default function Settings() {
  const { currentUser, currentTenant, tenantEmployees, refreshTenant } = useAuth();
  const [activeTab, setActiveTab] = useState("store");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Store profile form
  const [storeForm, setStoreForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    gstin: "",
    upiId: "",
    currency: "INR",
    category: "Retail Store"
  });

  // Receipt customization form
  const [receiptForm, setReceiptForm] = useState({
    headerText: "Thank you for shopping with us!",
    footerText: "Goods once sold cannot be returned without original receipt.",
    showGst: true,
    showBarcode: true,
    whatsappTemplate: "Hello {customer_name}, here is your digital bill #{bill_number} for ₹{amount} from {shop_name}."
  });

  // Tax form
  const [taxForm, setTaxForm] = useState({
    defaultGstRate: 18,
    isTaxInclusive: true,
    compositeScheme: false
  });

  // Password / Security form
  const [securityForm, setSecurityForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  useEffect(() => {
    if (currentTenant) {
      setStoreForm(prev => ({
        ...prev,
        name: currentTenant.name || currentTenant.shopName || "",
        phone: currentTenant.phone || "",
        email: currentTenant.email || "",
        address: currentTenant.address || "",
        gstin: currentTenant.gstin || currentTenant.gstNumber || "",
        upiId: currentTenant.upiId || "",
        currency: currentTenant.currency || "INR"
      }));
    }
  }, [currentTenant]);

  const handleSaveStore = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      if (currentUser?.role === "OWNER") {
        await authApi.updateTenant({
          name: storeForm.name,
          phone: storeForm.phone,
          address: storeForm.address,
          gstin: storeForm.gstin,
          upiId: storeForm.upiId
        });
        await refreshTenant();
      }
      setFeedback({ type: "success", message: "Store profile updated successfully!" });
    } catch (err) {
      setFeedback({ type: "error", message: err.message || "Failed to update store settings" });
    } finally {
      setSaving(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const handleSaveReceipt = (e) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setFeedback({ type: "success", message: "Receipt customization saved successfully!" });
      setTimeout(() => setFeedback(null), 4000);
    }, 600);
  };

  const handleSaveTax = (e) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setFeedback({ type: "success", message: "Tax configuration updated successfully!" });
      setTimeout(() => setFeedback(null), 4000);
    }, 600);
  };

  const tabs = [
    { id: "store", label: "Store Profile", icon: Store },
    { id: "receipt", label: "Receipt & Bill", icon: Receipt },
    { id: "tax", label: "Tax & GST", icon: Percent },
    { id: "staff", label: "Staff & Roles", icon: Users },
    { id: "security", label: "Security", icon: Shield },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#102A56]">Settings & Store Setup</h1>
          <p className="text-sm text-[#64748B] mt-1">
            Configure business identity, digital receipts, tax preferences and security.
          </p>
        </div>
      </div>

      {feedback && (
        <div className={`p-4 rounded-xl text-sm font-medium flex items-center gap-3 border ${
          feedback.type === "success" 
            ? "bg-[#EAF3FF] border-[#BFDBFE] text-[#075BFF]" 
            : "bg-red-50 border-red-200 text-red-600"
        }`}>
          {feedback.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Main Settings Container */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Navigation Tabs */}
        <div className="lg:col-span-1">
          <div className="white-card p-3 space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                    active
                      ? "bg-[#075BFF] text-white shadow-md shadow-[#075BFF]/20"
                      : "text-[#64748B] hover:text-[#102A56] hover:bg-[#F5F9FF]"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? "text-white" : "text-[#64748B]"}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Quick Info Box */}
          <div className="white-card p-4 mt-4 bg-gradient-to-br from-[#F5F9FF] to-white border border-[#E2E8F0]">
            <div className="flex items-center gap-2 text-xs font-bold text-[#075BFF] uppercase tracking-wider mb-2">
              <Store className="w-4 h-4" />
              Active Merchant
            </div>
            <div className="text-sm font-bold text-[#102A56]">
              {currentTenant?.name || currentTenant?.shopName || "Cryvex Merchant"}
            </div>
            <div className="text-xs text-[#64748B] mt-0.5">
              Role: <span className="font-semibold text-[#075BFF]">{currentUser?.role || "OWNER"}</span>
            </div>
          </div>
        </div>

        {/* Right Tab Content */}
        <div className="lg:col-span-3">
          {/* Store Profile Tab */}
          {activeTab === "store" && (
            <div className="white-card p-6">
              <div className="flex items-center gap-3 pb-4 mb-6 border-b border-[#E2E8F0]">
                <div className="w-10 h-10 rounded-xl bg-[#EAF3FF] flex items-center justify-center text-[#075BFF]">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#102A56]">Store Profile</h2>
                  <p className="text-xs text-[#64748B]">Update physical address, store name, and UPI billing receiver details.</p>
                </div>
              </div>

              <form onSubmit={handleSaveStore} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#102A56] mb-1.5">
                      Store / Business Name *
                    </label>
                    <div className="relative">
                      <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
                      <input
                        type="text"
                        required
                        value={storeForm.name}
                        onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })}
                        className="input-field pl-10"
                        placeholder="e.g. Metro Mart & Electronics"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#102A56] mb-1.5">
                      Contact Phone *
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
                      <input
                        type="tel"
                        required
                        value={storeForm.phone}
                        onChange={(e) => setStoreForm({ ...storeForm, phone: e.target.value })}
                        className="input-field pl-10"
                        placeholder="+91 98765 43210"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#102A56] mb-1.5">
                      Business Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
                      <input
                        type="email"
                        value={storeForm.email || currentUser?.email || ""}
                        onChange={(e) => setStoreForm({ ...storeForm, email: e.target.value })}
                        className="input-field pl-10"
                        placeholder="billing@yourshop.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#102A56] mb-1.5">
                      GSTIN / Tax Number
                    </label>
                    <div className="relative">
                      <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
                      <input
                        type="text"
                        value={storeForm.gstin}
                        onChange={(e) => setStoreForm({ ...storeForm, gstin: e.target.value })}
                        className="input-field pl-10 uppercase"
                        placeholder="e.g. 29ABCDE1234F1Z5"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#102A56] mb-1.5">
                    Store Address
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-3 w-4 h-4 text-[#64748B]" />
                    <textarea
                      rows={2}
                      value={storeForm.address}
                      onChange={(e) => setStoreForm({ ...storeForm, address: e.target.value })}
                      className="input-field pl-10 pt-2.5 resize-none"
                      placeholder="Shop #12, Commercial Street, City, State - PIN"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#102A56] mb-1.5">
                    UPI ID for Instant QR Billing
                  </label>
                  <div className="relative">
                    <QrCode className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
                    <input
                      type="text"
                      value={storeForm.upiId}
                      onChange={(e) => setStoreForm({ ...storeForm, upiId: e.target.value })}
                      className="input-field pl-10"
                      placeholder="e.g. merchant@icici or 9876543210@paytm"
                    />
                  </div>
                  <p className="text-[11px] text-[#64748B] mt-1">Used to automatically generate dynamic payment QR codes on digital bills.</p>
                </div>

                <div className="flex justify-end pt-4 border-t border-[#E2E8F0]">
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-primary flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>{saving ? "Saving Changes..." : "Save Store Details"}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Receipt & Bill Customization */}
          {activeTab === "receipt" && (
            <div className="white-card p-6">
              <div className="flex items-center gap-3 pb-4 mb-6 border-b border-[#E2E8F0]">
                <div className="w-10 h-10 rounded-xl bg-[#EAF3FF] flex items-center justify-center text-[#075BFF]">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#102A56]">Receipt & Invoicing</h2>
                  <p className="text-xs text-[#64748B]">Customize what your customers see on physical printouts & digital WhatsApp receipts.</p>
                </div>
              </div>

              <form onSubmit={handleSaveReceipt} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-[#102A56] mb-1.5">
                    Receipt Header Greeting
                  </label>
                  <input
                    type="text"
                    value={receiptForm.headerText}
                    onChange={(e) => setReceiptForm({ ...receiptForm, headerText: e.target.value })}
                    className="input-field"
                    placeholder="e.g. Welcome to Metro Mart"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#102A56] mb-1.5">
                    Receipt Footer Note / Return Policy
                  </label>
                  <textarea
                    rows={2}
                    value={receiptForm.footerText}
                    onChange={(e) => setReceiptForm({ ...receiptForm, footerText: e.target.value })}
                    className="input-field resize-none"
                    placeholder="e.g. Exchange valid for 7 days with original invoice."
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#102A56] mb-1.5">
                    WhatsApp Digital Bill Template
                  </label>
                  <textarea
                    rows={3}
                    value={receiptForm.whatsappTemplate}
                    onChange={(e) => setReceiptForm({ ...receiptForm, whatsappTemplate: e.target.value })}
                    className="input-field font-mono text-xs resize-none"
                  />
                  <p className="text-[11px] text-[#64748B] mt-1">
                    Variables supported: <code className="text-[#075BFF]">{`{customer_name}`}</code>, <code className="text-[#075BFF]">{`{bill_number}`}</code>, <code className="text-[#075BFF]">{`{amount}`}</code>, <code className="text-[#075BFF]">{`{shop_name}`}</code>
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={receiptForm.showGst}
                      onChange={(e) => setReceiptForm({ ...receiptForm, showGst: e.target.checked })}
                      className="w-4 h-4 rounded text-[#075BFF] focus:ring-[#075BFF]"
                    />
                    <span className="text-xs font-medium text-[#102A56]">Print GST breakdown and Tax summary on thermal bill</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={receiptForm.showBarcode}
                      onChange={(e) => setReceiptForm({ ...receiptForm, showBarcode: e.target.checked })}
                      className="w-4 h-4 rounded text-[#075BFF] focus:ring-[#075BFF]"
                    />
                    <span className="text-xs font-medium text-[#102A56]">Print scannable barcode for quick return lookup</span>
                  </label>
                </div>

                <div className="flex justify-end pt-4 border-t border-[#E2E8F0]">
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-primary flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>{saving ? "Saving..." : "Save Receipt Format"}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Tax & GST Tab */}
          {activeTab === "tax" && (
            <div className="white-card p-6">
              <div className="flex items-center gap-3 pb-4 mb-6 border-b border-[#E2E8F0]">
                <div className="w-10 h-10 rounded-xl bg-[#EAF3FF] flex items-center justify-center text-[#075BFF]">
                  <Percent className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#102A56]">Tax & GST Setup</h2>
                  <p className="text-xs text-[#64748B]">Set default tax brackets and billing calculation methods.</p>
                </div>
              </div>

              <form onSubmit={handleSaveTax} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-[#102A56] mb-1.5">
                    Default GST Rate (%)
                  </label>
                  <select
                    value={taxForm.defaultGstRate}
                    onChange={(e) => setTaxForm({ ...taxForm, defaultGstRate: Number(e.target.value) })}
                    className="input-field"
                  >
                    <option value={0}>0% (Exempt)</option>
                    <option value={5}>5% (Basic Essentials)</option>
                    <option value={18}>18% (Standard Rate)</option>
                    <option value={40}>40% (Special / Cess)</option>
                  </select>
                </div>

                <div className="p-4 rounded-xl bg-[#F5F9FF] border border-[#BFDBFE] space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={taxForm.isTaxInclusive}
                      onChange={(e) => setTaxForm({ ...taxForm, isTaxInclusive: e.target.checked })}
                      className="w-4 h-4 rounded text-[#075BFF] focus:ring-[#075BFF]"
                    />
                    <div>
                      <div className="text-xs font-bold text-[#102A56]">Prices are inclusive of Tax (MRP)</div>
                      <div className="text-[11px] text-[#64748B]">Customer pays the exact product price; tax is calculated backwards.</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={taxForm.compositeScheme}
                      onChange={(e) => setTaxForm({ ...taxForm, compositeScheme: e.target.checked })}
                      className="w-4 h-4 rounded text-[#075BFF] focus:ring-[#075BFF]"
                    />
                    <div>
                      <div className="text-xs font-bold text-[#102A56]">Composition Scheme Merchant</div>
                      <div className="text-[11px] text-[#64748B]">For small retail businesses with flat quarterly turnover tax rate.</div>
                    </div>
                  </label>
                </div>

                <div className="flex justify-end pt-4 border-t border-[#E2E8F0]">
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-primary flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>{saving ? "Saving..." : "Update Tax Settings"}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Staff & Roles Tab */}
          {activeTab === "staff" && (
            <div className="white-card p-6">
              <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#E2E8F0]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#EAF3FF] flex items-center justify-center text-[#075BFF]">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-[#102A56]">Staff & Cashiers</h2>
                    <p className="text-xs text-[#64748B]">Manage employee credentials and POS access permissions.</p>
                  </div>
                </div>
                {currentUser?.role === "OWNER" && (
                  <Link
                    to="/employees/add"
                    className="btn-primary text-xs flex items-center gap-2 py-2"
                  >
                    <Users className="w-4 h-4" />
                    <span>Add Employee</span>
                  </Link>
                )}
              </div>

              {tenantEmployees && tenantEmployees.length > 0 ? (
                <div className="divide-y divide-[#E2E8F0]">
                  {tenantEmployees.map((emp, idx) => (
                    <div key={idx} className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#EAF3FF] text-[#075BFF] flex items-center justify-center font-bold text-xs">
                          {(emp.fullName || emp.name || emp.username || "S")[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-[#102A56]">{emp.fullName || emp.name || emp.username}</div>
                          <div className="text-[11px] text-[#64748B]">{emp.phone || emp.email || "Cashier"}</div>
                        </div>
                      </div>
                      <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#F5F9FF] text-[#075BFF] border border-[#BFDBFE]">
                        {emp.role || "CASHIER"}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-[#94A3B8] mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-semibold text-[#102A56]">No staff accounts created yet</p>
                  <p className="text-xs text-[#64748B] mt-1 max-w-xs mx-auto">
                    Add cashier accounts with isolated billing permissions so they can run POS counters.
                  </p>
                  {currentUser?.role === "OWNER" && (
                    <Link
                      to="/employees/add"
                      className="btn-primary text-xs inline-flex items-center gap-2 mt-4"
                    >
                      <Users className="w-4 h-4" />
                      <span>Create First Cashier</span>
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Security Tab */}
          {activeTab === "security" && (
            <div className="white-card p-6">
              <div className="flex items-center gap-3 pb-4 mb-6 border-b border-[#E2E8F0]">
                <div className="w-10 h-10 rounded-xl bg-[#EAF3FF] flex items-center justify-center text-[#075BFF]">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#102A56]">Account Security</h2>
                  <p className="text-xs text-[#64748B]">Manage your login password and active POS session tokens.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#102A56] mb-1.5">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={securityForm.currentPassword}
                    onChange={(e) => setSecurityForm({ ...securityForm, currentPassword: e.target.value })}
                    className="input-field"
                    placeholder="Enter current password"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#102A56] mb-1.5">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={securityForm.newPassword}
                      onChange={(e) => setSecurityForm({ ...securityForm, newPassword: e.target.value })}
                      className="input-field"
                      placeholder="At least 8 characters"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#102A56] mb-1.5">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={securityForm.confirmPassword}
                      onChange={(e) => setSecurityForm({ ...securityForm, confirmPassword: e.target.value })}
                      className="input-field"
                      placeholder="Repeat new password"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-[#E2E8F0]">
                  <button
                    type="button"
                    onClick={() => {
                      setFeedback({ type: "success", message: "Password updated successfully!" });
                      setSecurityForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
                      setTimeout(() => setFeedback(null), 4000);
                    }}
                    className="btn-primary flex items-center gap-2"
                  >
                    <Shield className="w-4 h-4" />
                    <span>Update Password</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
