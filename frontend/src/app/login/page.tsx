"use client";
import React, { useState } from "react";
import { useThemeMode } from "@/lib/theme";
import { useAuth } from "@/components/providers/AuthProvider";
import { API_URL } from "@/lib/apiClient";
import { useRouter } from "next/navigation";
import { Building2, ShieldAlert, User, Lock, EyeOff, Eye, Moon, Sun } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const { isDark, toggleTheme } = useThemeMode();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    
    setLoading(true);
    setError("");
    
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to login");
      
      login(data.token, data.user);
    } catch (err: any) {
      setError(err.message || "Could not connect to authentication server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("h-screen w-full relative flex items-center justify-center font-sans overflow-hidden transition-colors duration-500", isDark ? "bg-[#0A1D29]" : "bg-slate-50")}>
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center z-0"
        style={{ backgroundImage: `url('/campus-bg.png')`, backgroundPosition: 'center' }}
      >
        <div className={cn("absolute inset-0 transition-colors duration-500", isDark ? "bg-black/30" : "bg-white/10")} />
        <div className={cn("absolute inset-0 bg-gradient-to-r transition-colors duration-500", isDark ? "from-black/80 via-transparent to-black/60" : "from-white/85 via-white/20 to-white/40")} />
      </div>

      {/* Header - Absolute at the top */}
      <header className="absolute top-0 left-0 w-full p-4 lg:p-6 lg:px-10 flex justify-between items-start z-30">
        <div className="flex items-center gap-4">
          <div className="w-10 h-12 bg-white rounded-lg p-1 flex items-center justify-center relative shadow-lg">
             <Image src="/logo.png" alt="SDMCET Logo" fill sizes="40px" className="object-contain p-1" priority />
          </div>
          <div className={cn("transition-colors duration-500", isDark ? "text-white" : "text-slate-900")}>
            <h1 className={cn("text-sm font-medium leading-tight", isDark ? "drop-shadow-md" : "")}>
              SDM College of Engineering<br />and Technology
            </h1>
            <p className={cn("text-[11px] mt-0.5", isDark ? "text-slate-300 drop-shadow-md" : "text-slate-600")}>Dharwad</p>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-1">
          <div className="hidden md:flex items-center gap-3">
            <span className={cn("text-xs font-semibold tracking-wide", isDark ? "text-white drop-shadow-md" : "text-slate-900")}>SDMCET LMS</span>
            <div className="w-6 h-0.5 bg-[#B18A52] shadow-sm"></div>
          </div>
          <button 
            onClick={toggleTheme}
            className={cn("p-2 rounded-full transition-colors", isDark ? "bg-white/10 text-white hover:bg-white/20" : "bg-slate-200 text-slate-700 hover:bg-slate-300")}
            aria-label="Toggle Theme"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Content - Center constrained */}
      <div className="container mx-auto px-6 md:px-12 flex items-center justify-between z-20 w-full h-full pt-20 pb-4">
        
        {/* Left Typography */}
        <div className={cn("w-full lg:w-1/2 flex flex-col justify-center h-full animate-in fade-in slide-in-from-left-4 duration-1000", isDark ? "text-white" : "text-slate-900")}>
          <div className="w-10 h-0.5 bg-[#B18A52] mb-5 shadow-sm"></div>
          
          <h1 className={cn("text-4xl lg:text-[3.5rem] font-bold leading-[1.05] mb-5 tracking-tight", isDark ? "drop-shadow-lg" : "")}>
            A <br />
            Stronger <br />
            Institution <br />
            <span className="text-[#B18A52]">Together</span>
          </h1>
          
          <p className={cn("text-lg lg:text-xl font-light mb-8", isDark ? "text-slate-200 drop-shadow-md" : "text-slate-700")}>
            Digital Staff Leave Management
          </p>
          
          <div className="relative pl-8 max-w-sm">
            <span className="text-4xl text-[#B18A52] absolute -top-1.5 left-0 font-serif leading-none drop-shadow-md">“</span>
            <p className={cn("text-lg lg:text-xl font-light italic leading-snug", isDark ? "text-slate-100 drop-shadow-md" : "text-slate-800")}>
              Leadership <br />
              enables <br />
              Academic Continuity.<span className="text-[#B18A52] font-serif text-2xl ml-1 leading-none">”</span>
            </p>
          </div>
        </div>

        {/* Right Login Box */}
        <div className="w-full lg:w-[400px] animate-in fade-in slide-in-from-right-4 duration-1000 delay-150 flex-shrink-0">
          <div className={cn("backdrop-blur-xl border rounded-[1.5rem] shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] p-6 lg:p-7 transition-colors duration-500", isDark ? "bg-black/20 border-white/10" : "bg-white/80 border-slate-200")}>
            
            <div className="flex flex-col items-center mb-5">
              <div className="w-10 h-10 bg-[#245A81] rounded-xl flex items-center justify-center text-white mb-3 shadow-lg shadow-blue-500/20">
                <Building2 className="w-5 h-5" strokeWidth={1.5} />
              </div>
              <h2 className={cn("text-xl font-semibold tracking-wide mb-1", isDark ? "text-white" : "text-slate-900")}>SDMCET LMS</h2>
              <p className={cn("text-[12px]", isDark ? "text-slate-300" : "text-slate-600")}>Digital Staff Leave Management</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className={cn("block text-[12px] font-medium mb-1.5", isDark ? "text-slate-200" : "text-slate-700")}>Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" strokeWidth={1.5} />
                  </div>
                  <input 
                    type="email" 
                    required 
                    placeholder="Enter your email"
                    className={cn("w-full pl-10 pr-4 py-2.5 rounded-lg border outline-none focus:ring-1 transition-all text-[13px] [&:-webkit-autofill]:[transition:background-color_5000s_ease-in-out_0s]", isDark ? "border-white/10 bg-black/40 text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:ring-blue-500/50 [&:-webkit-autofill]:bg-black/40 [&:-webkit-autofill]:[-webkit-text-fill-color:white]" : "border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500 [&:-webkit-autofill]:bg-white [&:-webkit-autofill]:[-webkit-text-fill-color:black]")} 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                  />
                </div>
              </div>
              
              <div>
                <label className={cn("block text-[12px] font-medium mb-1.5", isDark ? "text-slate-200" : "text-slate-700")}>Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" strokeWidth={1.5} />
                  </div>
                  <input 
                    type={showPassword ? "text" : "password"} 
                    required 
                    placeholder="Enter your password"
                    className={cn("w-full pl-10 pr-10 py-2.5 rounded-lg border outline-none focus:ring-1 transition-all text-[13px] [&:-webkit-autofill]:[transition:background-color_5000s_ease-in-out_0s]", isDark ? "border-white/10 bg-black/40 text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:ring-blue-500/50 [&:-webkit-autofill]:bg-black/40 [&:-webkit-autofill]:[-webkit-text-fill-color:white]" : "border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500 [&:-webkit-autofill]:bg-white [&:-webkit-autofill]:[-webkit-text-fill-color:black]")} 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    className={cn("absolute inset-y-0 right-0 pr-3.5 flex items-center transition-colors focus:outline-none", isDark ? "text-slate-400 hover:text-slate-200" : "text-slate-500 hover:text-slate-700")}
                  >
                     {showPassword ? <EyeOff className="w-4 h-4" strokeWidth={1.5} /> : <Eye className="w-4 h-4" strokeWidth={1.5} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className={cn("p-2.5 border font-medium text-[11px] rounded-lg flex items-start gap-2 backdrop-blur-md", isDark ? "bg-rose-500/20 border-rose-500/30 text-rose-200" : "bg-rose-50 border-rose-200 text-rose-700")}>
                  <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" /> 
                  <span className="leading-snug">{error}</span>
                </div>
              )}

              <button 
                type="submit" 
                disabled={loading} 
                className="w-full bg-[#245A81] hover:bg-[#1D4A6B] text-white font-medium py-2.5 rounded-lg transition-all mt-4 text-[13.5px] flex items-center justify-center gap-2 shadow-md"
              >
                {loading ? "Signing in..." : "Sign In"}
                {!loading && <span className="text-sm leading-none ml-1">→</span>}
              </button>
            </form>

            <div className="mt-4 text-center">
              <p className={cn("text-[12px]", isDark ? "text-slate-300" : "text-slate-600")}>
                New staff member? <Link href="/register" className="text-[#2F6E9E] font-semibold hover:text-blue-500 transition-colors">Register here</Link>
              </p>
            </div>
            
            <div className={cn("mt-4 pt-4 border-t text-center", isDark ? "border-white/10" : "border-slate-200")}>
              <p className={cn("text-[10px] mb-0.5 uppercase tracking-wider font-semibold", isDark ? "text-slate-300" : "text-slate-500")}>Demo Accounts:</p>
              <p className={cn("text-[10px] mb-0.5", isDark ? "text-slate-300/80" : "text-slate-600")}>faculty | cse_hod | principal (@sdmcet.ac.in)</p>
              <p className={cn("text-[10px]", isDark ? "text-slate-300/80" : "text-slate-600")}>Password: password123</p>
            </div>
            
          </div>
        </div>

      </div>
    </div>
  );
}
