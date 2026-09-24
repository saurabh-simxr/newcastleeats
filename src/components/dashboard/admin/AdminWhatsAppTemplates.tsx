"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Search, CheckCircle2, Clock, XCircle, HelpCircle,
  MessageCircle, ChevronDown, RefreshCw,
} from "lucide-react";
import PageHeader from "@/components/dashboard/shared/PageHeader";
import { format } from "date-fns";
import { toast } from "sonner";
import { useAuthStore } from "@/store/useAuthStore";

type Template = {
  name: string;
  sid: string;
  trigger: string;
  twilioType: string;
  status: string;
  category: string | null;
  rejectionReason: string | null;
  lastUpdated: string | null;
};

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: typeof CheckCircle2 }> = {
  approved:     { label: "Approved",  color: "#16a34a", bg: "#f0fdf4", icon: CheckCircle2 },
  pending:      { label: "Pending",   color: "#d97706", bg: "#fffbeb", icon: Clock },
  received:     { label: "Pending",   color: "#d97706", bg: "#fffbeb", icon: Clock },
  rejected:     { label: "Rejected",  color: "#dc2626", bg: "#fef2f2", icon: XCircle },
  unsubmitted:  { label: "Not submitted", color: "#6b7280", bg: "#f9fafb", icon: HelpCircle },
  not_found:    { label: "Not found on Twilio", color: "#dc2626", bg: "#fef2f2", icon: XCircle },
};

export default function AdminWhatsAppTemplates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { session } = useAuthStore();

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/whatsapp-templates", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const data = await res.json();
      if (res.ok) setTemplates(data.data.templates || []);
      else toast.error(data.error || "Failed to fetch templates");
    } catch {
      toast.error("Failed to fetch WhatsApp templates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (session) fetchTemplates(); }, [session]);

  const filtered = useMemo(() => {
    return templates.filter((t) => {
      const q = search.toLowerCase();
      const matchSearch = !q || t.name.toLowerCase().includes(q) || t.sid.toLowerCase().includes(q);
      const matchStatus = statusFilter === "all" || t.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [templates, search, statusFilter]);

  const approvedCount = templates.filter((t) => t.status === "approved").length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="WhatsApp Templates"
        subtitle={`${approvedCount}/${templates.length} approved · live status from Twilio`}
      />

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by template name or SID…"
            className="w-full h-10 pl-9 pr-4 rounded-xl border border-gray-200 text-sm outline-none bg-white focus:border-gray-400"
          />
        </div>

        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 pl-3 pr-8 rounded-xl border border-gray-200 text-sm outline-none bg-white appearance-none cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
            <option value="unsubmitted">Not submitted</option>
            <option value="not_found">Not found on Twilio</option>
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        </div>

        <button
          onClick={fetchTemplates}
          disabled={loading}
          className="h-10 px-4 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-5 py-3 text-left font-semibold text-gray-500">Template</th>
                <th className="px-5 py-3 text-left font-semibold text-gray-500 hidden md:table-cell">Trigger</th>
                <th className="px-5 py-3 text-left font-semibold text-gray-500 hidden lg:table-cell">SID</th>
                <th className="px-5 py-3 text-left font-semibold text-gray-500 hidden lg:table-cell">Category</th>
                <th className="px-5 py-3 text-left font-semibold text-gray-500 hidden lg:table-cell">Updated</th>
                <th className="px-5 py-3 text-left font-semibold text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center text-gray-400">Loading templates…</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <MessageCircle className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No matching templates</p>
                  </td>
                </tr>
              ) : filtered.map((t) => {
                const meta = STATUS_META[t.status] ?? STATUS_META.unsubmitted;
                const Icon = meta.icon;
                return (
                  <tr key={t.sid} className="hover:bg-gray-50 transition-colors" title={t.rejectionReason || undefined}>
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-medium text-gray-900">{t.name}</p>
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      <p className="text-sm text-gray-500 truncate max-w-[220px]">{t.trigger || "—"}</p>
                    </td>
                    <td className="px-5 py-3.5 hidden lg:table-cell">
                      <p className="text-xs font-mono text-gray-400">{t.sid}</p>
                    </td>
                    <td className="px-5 py-3.5 hidden lg:table-cell">
                      <p className="text-xs text-gray-500">{t.category || "—"}</p>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-400 hidden lg:table-cell whitespace-nowrap">
                      {t.lastUpdated ? format(new Date(t.lastUpdated), "MMM d, yyyy") : "—"}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
                        style={{ color: meta.color, background: meta.bg }}
                      >
                        <Icon className="w-3 h-3" />
                        {meta.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
