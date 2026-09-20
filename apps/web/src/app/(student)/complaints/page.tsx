"use client";

import React, { useState } from "react";
import { Wrench, CheckCircle2, Clock, Plus, Send, Phone, ShieldAlert } from "lucide-react";
import { GlassCard } from "@/components/glass-card";

interface Complaint {
  id: string;
  ticketNumber: string;
  category: string;
  title: string;
  location: string;
  priority: "low" | "medium" | "high" | "emergency";
  status: "pending" | "in_progress" | "resolved";
  createdAt: string;
  technician?: string;
  otp?: string;
  resolutionNote?: string;
}

const INITIAL_COMPLAINTS: Complaint[] = [
  {
    id: "c-1",
    ticketNumber: "TKT-2026-084",
    category: "Air Conditioning",
    title: "Split AC Thermostat Sensor Reading High",
    location: "Room 304, Tower A (Aryabhata)",
    priority: "medium",
    status: "in_progress",
    createdAt: "Sep 20, 2026",
    technician: "Ramesh Sharma (HVAC Team)",
    otp: "8492",
    resolutionNote: "Technician dispatched with replacement sensor module.",
  },
  {
    id: "c-2",
    ticketNumber: "TKT-2026-061",
    category: "Wi-Fi & LAN",
    title: "Ethernet Port Speed Capped at 100 Mbps",
    location: "Room 304, Bed A1 Port",
    priority: "low",
    status: "resolved",
    createdAt: "Sep 18, 2026",
    technician: "Anand Verma (IT Network)",
    resolutionNote: "Cat6 patch cable replaced; 1 Gbps line verified.",
  },
  {
    id: "c-3",
    ticketNumber: "TKT-2026-039",
    category: "Carpentry",
    title: "Study Table Drawer Lock Key Replacement",
    location: "Room 304, Desk A",
    priority: "low",
    status: "resolved",
    createdAt: "Sep 15, 2026",
    technician: "Suresh Mistri",
    resolutionNote: "Duplicate brass key issued and signed by student.",
  },
];

export default function StudentComplaintsPage() {
  const [complaints, setComplaints] = useState<Complaint[]>(INITIAL_COMPLAINTS);
  const [showNewModal, setShowNewModal] = useState(false);
  const [category, setCategory] = useState("Electrical");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "emergency">("medium");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submittedMessage, setSubmittedMessage] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newTicket: Complaint = {
      id: `c-${Date.now()}`,
      ticketNumber: `TKT-2026-${Math.floor(100 + Math.random() * 900)}`,
      category,
      title,
      location: "Room 304, Tower A (Aryabhata)",
      priority,
      status: "pending",
      createdAt: "Just now",
    };

    setComplaints([newTicket, ...complaints]);
    setTitle("");
    setDescription("");
    setShowNewModal(false);
    setSubmittedMessage(true);
    setTimeout(() => setSubmittedMessage(false), 5000);
  };

  const getPriorityBadge = (p: Complaint["priority"]) => {
    switch (p) {
      case "emergency":
        return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30";
      case "high":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30";
      case "medium":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30";
      default:
        return "bg-muted/30 text-muted border-border";
    }
  };

  const getStatusBadge = (s: Complaint["status"]) => {
    switch (s) {
      case "in_progress":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
      case "resolved":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
      default:
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* 1. Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-200/80 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:border-brand-800 dark:bg-brand-900/40 dark:text-brand-300 mb-2">
            <Wrench className="h-3.5 w-3.5" />
            <span>Campus Estate Maintenance</span>
          </div>
          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-text sm:text-4xl">
            Maintenance & Helpdesk
          </h1>
          <p className="mt-1 text-sm text-muted">
            Report electrical, plumbing, air conditioning, or internet issues with OTP-verified
            technician resolution.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowNewModal(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-500 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>New Maintenance Request</span>
        </button>
      </div>

      {submittedMessage && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>
            Your maintenance ticket was successfully logged and assigned to the duty technician.
          </span>
        </div>
      )}

      {/* 2. Emergency Hotline Quick Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <GlassCard className="p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-600 shrink-0">
            <Phone className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-text">Hostel Emergency</span>
            <p className="text-xs font-mono text-muted">+91 1800-NIT-SOS</p>
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 shrink-0">
            <Wrench className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-text">Electrician on Duty</span>
            <p className="text-xs font-mono text-muted">Ext 3041 / +91 98765-01001</p>
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 shrink-0">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-text">Plumbing Helpdesk</span>
            <p className="text-xs font-mono text-muted">Ext 3042 / +91 98765-01002</p>
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 shrink-0">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-text">Warden Office Desk</span>
            <p className="text-xs font-mono text-muted">Ext 3001 (Ground Floor)</p>
          </div>
        </GlassCard>
      </div>

      {/* 3. New Ticket Modal / In-line Form */}
      {showNewModal && (
        <GlassCard className="p-6 border-brand-500/30">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-lg font-bold text-text">Submit Maintenance Ticket</h2>
            <button
              type="button"
              onClick={() => setShowNewModal(false)}
              className="text-xs font-semibold text-muted hover:text-text"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">
                  Issue Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-text focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="Air Conditioning">Air Conditioning / HVAC</option>
                  <option value="Electrical">Electrical (Lights, Fan, Switchboard)</option>
                  <option value="Plumbing">Plumbing & Water Supply</option>
                  <option value="Wi-Fi & LAN">Campus Wi-Fi & Ethernet Port</option>
                  <option value="Carpentry">Carpentry (Bed, Chair, Door Lock)</option>
                  <option value="Cleanliness">Room & Corridor Housekeeping</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1">
                  Priority Level
                </label>
                <select
                  value={priority}
                  onChange={(e) =>
                    setPriority(e.target.value as "low" | "medium" | "high" | "emergency")
                  }
                  className="w-full rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-text focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="low">Low (Standard 48-hour SLA)</option>
                  <option value="medium">Medium (Standard 24-hour SLA)</option>
                  <option value="high">High (Urgent 6-hour SLA)</option>
                  <option value="emergency">Emergency (Immediate Safety Disruption)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted mb-1">Issue Title</label>
              <input
                type="text"
                placeholder="E.g., Switchboard socket sparking or AC water leakage"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-text placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted mb-1">
                Detailed Description (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="Provide any extra details or time windows when you will be present in Room 304..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-text placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-muted hover:text-text"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-500 transition-colors"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Submit Ticket</span>
              </button>
            </div>
          </form>
        </GlassCard>
      )}

      {/* 4. Active & Resolved Tickets List */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-heading text-lg font-bold text-text">Your Maintenance Tickets</h2>
            <p className="text-xs text-muted">
              Track technician assignments and provide completion OTPs
            </p>
          </div>
          <span className="text-xs font-semibold text-muted">
            {complaints.length} Total Requests
          </span>
        </div>

        <div className="space-y-4">
          {complaints.map((c) => (
            <div
              key={c.id}
              className="rounded-xl border border-border/60 bg-card/60 p-5 hover:border-brand-500/40 transition-colors"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className="font-mono text-xs font-bold text-brand-600 dark:text-brand-400">
                      {c.ticketNumber}
                    </span>
                    <span
                      className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getPriorityBadge(c.priority)}`}
                    >
                      {c.priority}
                    </span>
                    <span className="text-xs text-muted">• {c.category}</span>
                  </div>
                  <h3 className="text-sm font-bold text-text">{c.title}</h3>
                  <p className="text-xs text-muted mt-0.5">
                    {c.location} • Logged {c.createdAt}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {c.status === "in_progress" && c.otp && (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-center">
                      <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-300">
                        Completion OTP
                      </span>
                      <p className="font-mono text-sm font-bold text-amber-600 dark:text-amber-400">
                        {c.otp}
                      </p>
                    </div>
                  )}

                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold capitalize ${getStatusBadge(c.status)}`}
                  >
                    {c.status === "resolved" && <CheckCircle2 className="h-3 w-3" />}
                    {c.status.replace("_", " ")}
                  </span>
                </div>
              </div>

              {(c.technician || c.resolutionNote) && (
                <div className="mt-4 rounded-lg bg-muted/10 p-3 text-xs border border-border/30">
                  {c.technician && (
                    <p className="font-medium text-text">
                      <span className="text-muted">Assigned Technician:</span> {c.technician}
                    </p>
                  )}
                  {c.resolutionNote && (
                    <p className="mt-1 text-muted">
                      <span className="font-medium text-text">Resolution Note:</span>{" "}
                      {c.resolutionNote}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
