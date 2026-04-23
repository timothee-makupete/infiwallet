"use client";

import { useState } from "react";
import {
  Settings as SettingsIcon,
  Bell,
  Lock,
  Users,
  Database,
  Mail,
  Save,
  AlertCircle,
} from "lucide-react";

export default function AdminSettings() {
  const [notifications, setNotifications] = useState({
    kycApproved: true,
    largeTransaction: true,
    systemAlerts: true,
    weeklyReport: false,
  });

  const [security, setSecurity] = useState({
    twoFactor: false,
    ipWhitelist: false,
    sessionTimeout: 30,
  });

  const [saved, setSaved] = useState(false);

  const handleNotificationChange = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
    setSaved(false);
  };

  const handleSecurityChange = (key: keyof typeof security, value: any) => {
    setSecurity((prev) => ({
      ...prev,
      [key]: value,
    }));
    setSaved(false);
  };

  const handleSave = () => {
    // In a real app, this would save to the backend
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">Settings</h2>
        <p className="text-slate-400">Manage admin preferences and system configuration</p>
      </div>

      {saved && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 flex items-center gap-3 text-emerald-400">
          <CheckCircle2 size={20} />
          <span className="text-sm font-medium">Settings saved successfully</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Notifications */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-slate-800 rounded-lg">
              <Bell size={20} className="text-amber-400" />
            </div>
            <h3 className="font-semibold text-white text-lg">Notifications</h3>
          </div>

          <div className="space-y-4">
            {[
              { key: "kycApproved" as const, label: "KYC Approvals", desc: "Notify when users complete KYC" },
              {
                key: "largeTransaction" as const,
                label: "Large Transactions",
                desc: "Alert on transactions > 100K",
              },
              { key: "systemAlerts" as const, label: "System Alerts", desc: "Critical system notifications" },
              { key: "weeklyReport" as const, label: "Weekly Report", desc: "Summary email every Monday" },
            ].map((item) => (
              <label key={item.key} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifications[item.key]}
                  onChange={() => handleNotificationChange(item.key)}
                  className="w-4 h-4 rounded bg-slate-800 border border-slate-700 cursor-pointer accent-amber-400"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{item.label}</p>
                  <p className="text-xs text-slate-400">{item.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Security */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-slate-800 rounded-lg">
              <Lock size={20} className="text-amber-400" />
            </div>
            <h3 className="font-semibold text-white text-lg">Security</h3>
          </div>

          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={security.twoFactor}
                onChange={(e) => handleSecurityChange("twoFactor", e.target.checked)}
                className="w-4 h-4 rounded bg-slate-800 border border-slate-700 cursor-pointer accent-amber-400"
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-white">Two-Factor Authentication</p>
                <p className="text-xs text-slate-400">Require 2FA for admin login</p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={security.ipWhitelist}
                onChange={(e) => handleSecurityChange("ipWhitelist", e.target.checked)}
                className="w-4 h-4 rounded bg-slate-800 border border-slate-700 cursor-pointer accent-amber-400"
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-white">IP Whitelist</p>
                <p className="text-xs text-slate-400">Restrict access to specific IPs</p>
              </div>
            </label>

            <div>
              <label className="block text-sm font-medium text-white mb-2">Session Timeout</label>
              <select
                value={security.sessionTimeout}
                onChange={(e) => handleSecurityChange("sessionTimeout", parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-amber-400 transition-colors"
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
                <option value={120}>2 hours</option>
              </select>
            </div>
          </div>
        </div>

        {/* System Info */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 lg:col-span-2">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-slate-800 rounded-lg">
              <Database size={20} className="text-amber-400" />
            </div>
            <h3 className="font-semibold text-white text-lg">System Information</h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "API Version", value: "v1.0.0" },
              { label: "Database", value: "PostgreSQL 16" },
              { label: "Uptime", value: "45 days" },
              { label: "Last Backup", value: "2 hours ago" },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-xs text-slate-400 mb-1">{item.label}</p>
                <p className="text-sm font-semibold text-white">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="px-6 py-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold transition-colors flex items-center gap-2"
        >
          <Save size={18} />
          Save Settings
        </button>
      </div>
    </div>
  );
}

function CheckCircle2({ size, className }: { size: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
