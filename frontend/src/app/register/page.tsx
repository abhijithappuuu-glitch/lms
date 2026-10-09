"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Building2, ShieldAlert, CheckCircle2, Moon, Sun } from "lucide-react";
import { API_URL } from "@/lib/apiClient";
import { useThemeMode } from "@/lib/theme";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    fullName: "", email: "", password: "",
    departmentId: "", category: "TEACHING", serviceType: "VACATION", tenureStatus: "PERMANENT"
  });
  
  const [departments, setDepartments] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { isDark, toggleTheme } = useThemeMode();

  useEffect(() => {
    // We actually need a public departments endpoint, but let's just hardcode the list for the UI.
    setDepartments([
      { id: "dept-cse", code: "CSE", name: "Computer Science & Engineering" },
      { id: "dept-ise", code: "ISE", name: "Information Science & Engineering" },
      { id: "dept-mech", code: "MECH", name: "Mechanical Engineering" },
      { id: "dept-civil", code: "CIVIL", name: "Civil Engineering" },
      { id: "dept-eee", code: "EEE", name: "Electrical & Electronics Engineering" },
      { id: "dept-ece", code: "ECE", name: "Electronics & Communication Engineering" },
      { id: "dept-admin", code: "ADMIN", name: "Central Administration" }
    ]);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      // Find actual DB department ID
      // To keep demo simple, we need the actual uuid of the department. Let's assume we can fetch it or backend resolves it.
      // I'll make the backend resolve it by code if we pass code.
      
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Registration failed");
      
      setSuccess(true);
      setTimeout(() => router.push("/login"), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full px-4 py-2.5 rounded-lg border text-sm outline-none transition-all bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:bg-slate-900/60 dark:border-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-500/60";
  const selectCls = "w-full px-3 py-2.5 text-sm rounded-lg border outline-none transition-all bg-white border-slate-300 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:bg-slate-900/60 dark:border-slate-700 dark:text-slate-100";
  const labelCls = "block text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300 mb-1.5";

  const themeToggle = (
    <button
      type="button"
      id="register-theme-toggle"
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className="fixed top-5 right-5 z-30 p-2.5 rounded-full border shadow-sm transition-colors bg-white border-slate-200 text-slate-700 hover:bg-slate-100 dark:bg-slate-800/80 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700"
    >
      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );

  const backdrop = (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url('/campus-bg.png')` }}
      />
      <div className="absolute inset-0 bg-white/30 dark:bg-black/50 transition-colors duration-500" />
      <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-transparent to-white/50 dark:from-black/60 dark:via-black/20 dark:to-black/70 transition-colors duration-500" />
    </div>
  );

  if (success) {
    return (
      <div className="relative min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950 transition-colors">
        {backdrop}
        {themeToggle}
        <div className="relative max-w-md w-full rounded-2xl shadow-xl p-8 text-center animate-in zoom-in border bg-white border-slate-100 dark:bg-slate-900/80 dark:border-slate-800 backdrop-blur-xl">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Registration Submitted</h2>
          <p className="text-slate-500 dark:text-slate-400">Your profile has been routed to the HOD for approval. You will be able to log in once activated.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 py-12 bg-slate-50 dark:bg-slate-950 transition-colors">
      {backdrop}
      {themeToggle}
      <div className="relative max-w-xl w-full rounded-2xl shadow-xl border p-8 bg-white/90 border-slate-100 dark:bg-slate-900/80 dark:border-slate-800 dark:shadow-black/40 backdrop-blur-xl">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white mb-3 shadow-lg shadow-blue-500/30">
            <Building2 className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Staff Registration</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">SDMCET Digital Staff Leave Management</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="reg-fullname" className={labelCls}>Full Name</label>
              <input id="reg-fullname" type="text" required className={inputCls} value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} />
            </div>
            <div>
              <label htmlFor="reg-email" className={labelCls}>Email</label>
              <input id="reg-email" type="email" required className={inputCls} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
            </div>
          </div>
          
          <div>
            <label htmlFor="reg-password" className={labelCls}>Password</label>
            <input id="reg-password" type="password" required className={inputCls} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
          </div>

          <div>
            <label htmlFor="reg-department" className={labelCls}>Department</label>
            <select id="reg-department" required className={selectCls} value={formData.departmentId} onChange={e => setFormData({...formData, departmentId: e.target.value})}>
              <option value="">Select Department...</option>
              {departments.map(d => <option key={d.code} value={d.code}>{d.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="reg-category" className={labelCls}>Category</label>
              <select id="reg-category" className={selectCls} value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                <option value="TEACHING">Teaching</option>
                <option value="NON_TEACHING">Non-Teaching</option>
              </select>
            </div>
            <div>
              <label htmlFor="reg-service" className={labelCls}>Service Type</label>
              <select id="reg-service" className={selectCls} value={formData.serviceType} onChange={e => setFormData({...formData, serviceType: e.target.value})}>
                <option value="VACATION">Vacation</option>
                <option value="NON_VACATION">Non-Vacation</option>
              </select>
            </div>
            <div>
              <label htmlFor="reg-tenure" className={labelCls}>Tenure</label>
              <select id="reg-tenure" className={selectCls} value={formData.tenureStatus} onChange={e => setFormData({...formData, tenureStatus: e.target.value})}>
                <option value="PERMANENT">Permanent / Aided</option>
                <option value="UNAIDED">Unaided</option>
                <option value="PROBATIONARY">Probationary</option>
                <option value="CONTRACTUAL">Contractual</option>
              </select>
            </div>
          </div>

          {error && <div className="p-3 border text-sm rounded-lg flex items-center gap-2 mt-4 bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-300"><ShieldAlert className="w-4 h-4 shrink-0" /> {error}</div>}

          <button id="reg-submit" type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors shadow-md shadow-blue-600/20 disabled:opacity-70 mt-6">
            {loading ? "Submitting..." : "Register"}
          </button>
        </form>
        
        <div className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          Already have an account? <a href="/login" className="text-blue-600 dark:text-blue-400 font-medium hover:underline">Sign In</a>
        </div>
      </div>
    </div>
  );
}
