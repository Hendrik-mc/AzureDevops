"use client";

import { signIn } from "next-auth/react";
import { Shield, BarChart3, Eye, FileText } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="h-16 w-16 bg-blue-600 rounded-2xl flex items-center justify-center">
              <Shield className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Azure DevOps Control Tower
          </h1>
          <p className="mt-3 text-slate-400">
            Enterprise visibility, cost intelligence, and security monitoring
            for your Azure infrastructure
          </p>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 space-y-6">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <BarChart3 className="h-5 w-5 text-blue-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-white">FinOps Intelligence</p>
                <p className="text-xs text-slate-400">Real-time cost analysis and optimization</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-green-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-white">Security Posture</p>
                <p className="text-xs text-slate-400">Defender for Cloud score and compliance</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Eye className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-white">Full Visibility</p>
                <p className="text-xs text-slate-400">Asset inventory, health, and activity</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-purple-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-white">Evidence Reports</p>
                <p className="text-xs text-slate-400">Exportable PDF reports with audit trails</p>
              </div>
            </div>
          </div>

          <button
            onClick={() => signIn("azure-ad", { callbackUrl: "/overview" })}
            className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            <svg className="h-5 w-5" viewBox="0 0 21 21" fill="none">
              <path d="M0 0H10V10H0V0Z" fill="#F25022" />
              <path d="M11 0H21V10H11V0Z" fill="#7FBA00" />
              <path d="M0 11H10V21H0V11Z" fill="#00A4EF" />
              <path d="M11 11H21V21H11V11Z" fill="#FFB900" />
            </svg>
            Sign in with Microsoft
          </button>

          <p className="text-xs text-slate-500 text-center">
            Read-only access. Requires Azure Reader, Cost Management Reader, and Security Reader roles.
          </p>
        </div>
      </div>
    </div>
  );
}
