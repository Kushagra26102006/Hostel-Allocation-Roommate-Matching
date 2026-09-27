"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { HelpCircle, Phone, Mail, Building, Send, ChevronDown } from "lucide-react";
import { toast } from "sonner";

export default function StudentHelpPage() {
  const [openFaq, setOpenFaq] = React.useState<number | null>(0);
  const [ticketSubject, setTicketSubject] = React.useState("");
  const [ticketMsg, setTicketMsg] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const faqs = [
    {
      q: "How does the Gale-Shapley matching algorithm ensure fair allocation?",
      a: "The Gale-Shapley deferred-acceptance algorithm mathematically guarantees Pareto-efficient, stable matches with zero priority inversions. Students' ranked hostel preferences are matched against verified eligibility priority tiers, ensuring no student is bypassed by someone with lower standing.",
    },
    {
      q: "What documents must I present during physical key handover?",
      a: "You must bring: (1) Your official Allotment Letter with cryptographic QR verification; (2) Original Institute Student ID Card; (3) Verified tuition and hostel fee payment receipt. Report to Caretaker Counter 2 between October 1 and October 5.",
    },
    {
      q: "How does mutual roommate pairing work with privacy guarantees?",
      a: "Both students must mutually accept each other's invite code. Individual lifestyle questionnaire answers (sleep, study volume, cleanliness) are cryptographically salted and hashed. Only the mathematical compatibility cosine vector (e.g. 92%) is computed.",
    },
    {
      q: "What should I do if my fee receipt or document verification is delayed?",
      a: "Document verifications are processed within a 24-hour SLA by the Warden Administrative Office. If your fee receipt is pending beyond 24 hours, you may submit a quick inquiry ticket below or visit the Accounts Help Desk in the Main Building.",
    },
    {
      q: "Can I request a room transfer or appeal my assigned residence?",
      a: "Yes. Post-allocation transfers can be requested through the 'Room Change' service for documented academic or medical needs. If you believe policy criteria were overlooked, you may submit a formal petition under the 'Appeals' workflow.",
    },
  ];

  const handleTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketMsg.trim()) {
      toast.error("Please fill in both subject and description.");
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setTicketSubject("");
      setTicketMsg("");
      toast.success(
        "Support ticket #TK-8812 logged! Warden help desk will respond within 4 hours.",
      );
    }, 600);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="border-b border-border/60 pb-5">
        <div className="inline-flex items-center gap-2 rounded-full border border-brand-200/80 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:border-brand-800 dark:bg-brand-950/40 dark:text-brand-300">
          <HelpCircle className="h-3.5 w-3.5" />
          <span>Student Housing Assistance & Directory</span>
        </div>
        <h1 className="mt-2 font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Help & Support Centre
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-muted">
          Find answers to common allocation questions, contact hall wardens, or lodge a direct desk
          ticket.
        </p>
      </div>

      {/* Emergency Contacts Bento */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl border border-border/80 bg-surface shadow-xs space-y-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-600">
            <Building className="h-5 w-5" />
          </div>
          <span className="font-heading text-sm font-bold text-foreground block">
            Aryabhata Hall Caretaker
          </span>
          <p className="text-xs text-muted">Counter 2 &bull; 09:00 AM – 05:30 PM</p>
          <span className="font-mono text-xs font-bold text-brand-600 block">011-2659-8812</span>
        </div>

        <div className="p-5 rounded-3xl border border-border/80 bg-surface shadow-xs space-y-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-600">
            <Mail className="h-5 w-5" />
          </div>
          <span className="font-heading text-sm font-bold text-foreground block">
            Chief Warden Secretariat
          </span>
          <p className="text-xs text-muted">Housing Policy & Grievances</p>
          <span className="font-mono text-xs font-bold text-brand-600 block">
            warden.council@campus.edu
          </span>
        </div>

        <div className="p-5 rounded-3xl border border-rose-500/20 bg-rose-50/20 dark:bg-rose-950/20 shadow-xs space-y-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600">
            <Phone className="h-5 w-5" />
          </div>
          <span className="font-heading text-sm font-bold text-foreground block">
            24/7 Campus Emergency
          </span>
          <p className="text-xs text-muted">Medical Response & Security</p>
          <span className="font-mono text-xs font-bold text-rose-600 block">
            1800-11-2299 (Toll Free)
          </span>
        </div>
      </div>

      {/* Frequently Asked Questions */}
      <div className="rounded-3xl border border-border/80 bg-surface p-6 sm:p-8 shadow-xs space-y-4">
        <div className="border-b border-border/60 pb-3">
          <h3 className="font-heading text-base font-bold text-foreground">
            Frequently Asked Questions
          </h3>
          <p className="text-xs text-muted mt-0.5">
            Key policies governing allocation, roommate matching, and key handover.
          </p>
        </div>

        <div className="space-y-3 pt-1">
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-border/70 overflow-hidden bg-surface-muted/30 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full p-4 text-left flex items-center justify-between gap-3 text-xs font-bold text-foreground hover:bg-surface-muted/60 transition-colors min-target-size"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`h-4 w-4 text-muted shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-brand-600" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 text-xs text-muted-foreground leading-relaxed border-t border-border/40 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Raise Support Ticket Form */}
      <div className="rounded-3xl border border-border/80 bg-surface p-6 sm:p-8 shadow-xs space-y-5">
        <div>
          <h3 className="font-heading text-lg font-bold text-foreground">
            Lodge Direct Inquiry / Support Ticket
          </h3>
          <p className="text-xs text-muted mt-0.5">
            Need assistance with verification or room check-in? Send a direct dispatch to your hall
            warden desk.
          </p>
        </div>

        <form onSubmit={handleTicketSubmit} className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <Label htmlFor="ticketSubject" className="text-xs font-semibold">
              Subject of Inquiry *
            </Label>
            <Input
              id="ticketSubject"
              value={ticketSubject}
              onChange={(e) => setTicketSubject(e.target.value)}
              placeholder="e.g. Document verification inquiry or check-in reporting window clarification"
              className="text-xs rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ticketMsg" className="text-xs font-semibold">
              Detailed Description *
            </Label>
            <Textarea
              id="ticketMsg"
              rows={4}
              value={ticketMsg}
              onChange={(e) => setTicketMsg(e.target.value)}
              placeholder="Describe your issue or query. Please include roll number or receipt reference."
              className="text-xs rounded-2xl"
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs min-target-size"
            >
              <Send className="mr-1.5 h-3.5 w-3.5" />
              <span>{isSubmitting ? "Dispatching..." : "Submit Support Ticket"}</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
