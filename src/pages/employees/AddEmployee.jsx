import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../../services/api/authApi";
import { useAuth } from "../../context/AuthContext";
import { UserPlus, ArrowLeft, Eye, EyeOff, Shield, Phone, Mail, Lock, User } from "lucide-react";

export default function AddEmployee() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const role = currentUser?.role || "OWNER";
  
  useEffect(() => {
    if (role !== "OWNER") {
      navigate("/dashboard", { replace: true });
    }
  }, [role, navigate]);

  const [form, setForm] = useState({
    name: "",
    phone_number: "",
    email: "",
    password: "",
    role: "EMPLOYEE",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (error) setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const name = form.name.trim();
    const phoneNumber = form.phone_number.trim();
    const password = form.password;

    if (!name || !phoneNumber || !password) {
      setError("Name, phone number, and password are required.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      await authApi.createEmployee({
        name,
        phone_number: phoneNumber,
        email: form.email.trim() || null,
        password,
        role: form.role,
      });

      navigate("/dashboard");
    } catch (submitError) {
      setError(submitError?.message || "Could not create employee.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="w-9 h-9 rounded-xl white-card flex items-center justify-center text-[#64748B] hover:text-[#102A56] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-[#102A56]">Add Staff Account</h1>
            <p className="text-xs text-[#64748B]">Provide credentials for cashiers or store managers.</p>
          </div>
        </div>
      </div>

      {/* Main Form White Card */}
      <div className="white-card p-6 sm:p-8">
        <div className="flex items-center gap-3 pb-5 mb-6 border-b border-[#E2E8F0]">
          <div className="w-10 h-10 rounded-xl bg-[#EAF3FF] flex items-center justify-center text-[#075BFF]">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#102A56]">Staff Credentials</h2>
            <p className="text-xs text-[#64748B]">Cashiers can use this login on mobile or counter POS tablets.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#102A56] mb-1.5">
              Full Name *
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className="input-field pl-10"
                placeholder="e.g. Ramesh Kumar"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#102A56] mb-1.5">
                Phone Number *
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
                <input
                  type="tel"
                  required
                  value={form.phone_number}
                  onChange={(e) => handleChange("phone_number", e.target.value)}
                  className="input-field pl-10"
                  placeholder="9876543210"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#102A56] mb-1.5">
                Email Address (Optional)
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  className="input-field pl-10"
                  placeholder="staff@store.com"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#102A56] mb-1.5">
                Login Password *
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={form.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  className="input-field pl-10 pr-10"
                  placeholder="Set initial password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#102A56]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#102A56] mb-1.5">
                Access Role
              </label>
              <div className="relative">
                <Shield className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
                <select
                  value={form.role}
                  onChange={(e) => handleChange("role", e.target.value)}
                  className="input-field pl-10"
                >
                  <option value="EMPLOYEE">Cashier / Staff (POS only)</option>
                  <option value="MANAGER">Store Manager (Billing & Inventory)</option>
                </select>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-medium text-red-600">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E2E8F0]">
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary text-xs flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>{isSubmitting ? "Creating Account..." : "Create Staff Account"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
