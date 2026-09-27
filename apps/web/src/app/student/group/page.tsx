"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AvatarStack } from "@/components/ui/avatar-stack";
import { StatusBadge } from "@/components/ui/status-badge";
import { useStudentGroup, useInviteGroupMember } from "@/hooks/use-mock-api";
import { Users, Copy, Plus, ShieldCheck, Check, Clock, Sparkles, QrCode, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export default function StudentGroupBuilderPage() {
  const { data: group } = useStudentGroup();
  const inviteMutation = useInviteGroupMember();
  const [inviteRoll, setInviteRoll] = React.useState("");
  const [copied, setCopied] = React.useState(false);
  const [showQrModal, setShowQrModal] = React.useState(false);

  // Incoming pending invitations mock
  const [incomingInvites, setIncomingInvites] = React.useState([
    {
      id: "inv-1",
      fromName: "Vikram Malhotra",
      rollNo: "23CS10095",
      programme: "B.Tech Computer Science",
      compatibility: 86,
      sentAt: "Yesterday",
    },
  ]);

  const copyCode = () => {
    if (group?.code) {
      navigator.clipboard.writeText(group.code);
      setCopied(true);
      toast.success("Roommate Invite Code copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteRoll.trim()) {
      toast.error("Please enter a valid roll number");
      return;
    }
    inviteMutation.mutate(inviteRoll.trim(), {
      onSuccess: () => {
        toast.success(`Invitation successfully dispatched to Roll No: ${inviteRoll.trim()}`);
        setInviteRoll("");
      },
    });
  };

  const handleAcceptInvite = (id: string, name: string) => {
    setIncomingInvites((prev) => prev.filter((i) => i.id !== id));
    toast.success(`Accepted roommate invitation from ${name}!`);
  };

  const handleDeclineInvite = (id: string, name: string) => {
    setIncomingInvites((prev) => prev.filter((i) => i.id !== id));
    toast.info(`Declined invitation from ${name}`);
  };

  const avatars =
    group?.members.map((m) => ({
      name: m.name,
      avatarUrl: m.avatarUrl,
    })) || [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 space-y-7 animate-in fade-in duration-200">
      {/* Header */}
      <div className="border-b border-border/60 pb-5">
        <div className="inline-flex items-center gap-2 rounded-full border border-brand-200/80 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:border-brand-800 dark:bg-brand-950/40 dark:text-brand-300">
          <Users className="h-3.5 w-3.5" />
          <span>Mutual Consent Pairing System</span>
        </div>
        <h1 className="mt-2 font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Roommate Group Management
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-muted">
          Form a mutual roommate pair or group to be placed together during the Gale-Shapley
          matching run.
        </p>
      </div>

      {/* Deadline Warning Banner */}
      <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-4 sm:p-5 flex items-start gap-3.5">
        <Clock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs text-muted-foreground leading-relaxed">
          <strong className="text-foreground font-semibold">
            Group Lock Deadline Approaching:{" "}
          </strong>
          Roommate groups must be mutually accepted and confirmed by both students before the
          preference lock deadline (3 days remaining). Unpaired students are automatically matched
          by the lifestyle engine.
        </div>
      </div>

      {/* Group Info Hero Banner Card */}
      {group && (
        <div className="rounded-3xl border border-border/80 bg-surface p-6 sm:p-7 shadow-xs">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <AvatarStack avatars={avatars} size="lg" />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-heading text-lg sm:text-xl font-bold text-foreground">
                    {group.name}
                  </h3>
                  <StatusBadge status="approved" label="Pair Confirmed" />
                </div>
                <p className="text-xs text-muted mt-0.5">
                  Target: Double Sharing AC &bull; {group.members.length} / 2 Members Paired &bull;
                  92% Compatibility
                </p>
              </div>
            </div>

            {/* Invite Code Box & QR Action */}
            <div className="flex items-center gap-2 rounded-2xl bg-surface-muted/50 p-2.5 px-3.5 border border-border/70 self-start sm:self-auto">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-muted tracking-wider">
                  Invite Code
                </span>
                <span className="font-mono text-sm font-bold text-foreground">{group.code}</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={copyCode}
                className="h-8 w-8 p-0 shrink-0 min-target-size"
                aria-label="Copy group invite code"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowQrModal(true)}
                className="h-8 w-8 p-0 shrink-0 min-target-size"
                aria-label="Share via QR Code"
              >
                <QrCode className="h-3.5 w-3.5 text-brand-600" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Member Cards Grid */}
      <div className="space-y-4">
        <h3 className="font-heading text-base font-bold text-foreground">
          Group Members & Mutual Consent Status
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {group?.members.map((member, idx) => (
            <motion.div
              key={member.studentId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="rounded-2xl border border-border/80 bg-surface p-5 shadow-xs space-y-4 hover:border-brand-500/40 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-600 font-bold text-sm">
                    {member.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </div>
                  <div>
                    <h4 className="font-heading text-sm sm:text-base font-bold text-foreground">
                      {member.name}
                    </h4>
                    <p className="font-mono text-xs text-muted">
                      {member.rollNo} &bull; {member.isLeader ? "Group Leader" : "Paired Resident"}
                    </p>
                  </div>
                </div>

                <span className="rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5">
                  Confirmed
                </span>
              </div>

              {/* Lifestyle Alignment Score */}
              <div className="p-3 rounded-xl bg-surface-muted/50 border border-border/60 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-brand-600" />
                  <span className="text-muted">Lifestyle Compatibility:</span>
                </div>
                <span className="font-bold text-emerald-600">
                  {member.compatibilityScore || 92}% Match
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-muted pt-2 border-t border-border/50">
                <span className="flex items-center gap-1 text-emerald-600">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Mutual Consent Verified
                </span>
                <span>Enrolled B.Tech</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Invite Member by Roll Number Form */}
      <div className="rounded-3xl border border-border/80 bg-surface p-6 shadow-xs space-y-4">
        <div>
          <h3 className="font-heading text-base font-bold text-foreground">
            Invite Classmate to Group
          </h3>
          <p className="text-xs text-muted mt-0.5">
            Enter your classmate&apos;s institutional Roll Number to dispatch a pairing invitation.
          </p>
        </div>

        <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
          <Input
            value={inviteRoll}
            onChange={(e) => setInviteRoll(e.target.value)}
            placeholder="e.g. 23CS10092"
            className="text-xs rounded-xl font-mono flex-1 min-target-size"
          />
          <Button
            type="submit"
            disabled={inviteMutation.isPending}
            className="bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold shrink-0 min-target-size"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            <span>{inviteMutation.isPending ? "Dispatching..." : "Send Invitation"}</span>
          </Button>
        </form>
      </div>

      {/* Pending Incoming Invitations */}
      {incomingInvites.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-heading text-base font-bold text-foreground">
            Incoming Pairing Requests
          </h3>

          {incomingInvites.map((inv) => (
            <div
              key={inv.id}
              className="rounded-2xl border border-brand-500/30 bg-surface p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-heading text-sm font-bold text-foreground">{inv.fromName}</h4>
                  <span className="font-mono text-xs text-muted">({inv.rollNo})</span>
                  <span className="rounded-md bg-emerald-500/10 text-emerald-600 text-[10px] font-bold px-2 py-0.5">
                    {inv.compatibility}% Match
                  </span>
                </div>
                <p className="text-xs text-muted mt-0.5">
                  {inv.programme} &bull; Received {inv.sentAt}
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                <Button
                  size="sm"
                  onClick={() => handleAcceptInvite(inv.id, inv.fromName)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs min-target-size"
                >
                  <Check className="mr-1 h-3.5 w-3.5" />
                  <span>Accept Pair</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDeclineInvite(inv.id, inv.fromName)}
                  className="text-xs border-border/80 min-target-size"
                >
                  <X className="mr-1 h-3.5 w-3.5" />
                  <span>Decline</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* QR Code Share Modal */}
      <Dialog open={showQrModal} onOpenChange={setShowQrModal}>
        <DialogContent className="max-w-sm p-6 text-center bg-surface text-foreground border-border/80">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-base font-bold">Share Roommate Invite Code</DialogTitle>
            <DialogDescription className="text-xs text-muted">
              Scan this QR code to join group &quot;{group?.name}&quot;
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 flex flex-col items-center justify-center space-y-3">
            <div className="p-4 bg-white rounded-2xl border border-zinc-200 shadow-sm">
              {/* Simulated QR Code matrix */}
              <div className="h-44 w-44 bg-zinc-950 p-2 rounded-xl flex items-center justify-center text-white font-mono text-[10px] text-center">
                [QR: CAMPUS-8819 &bull; HOSTELHUB]
              </div>
            </div>
            <div className="font-mono text-sm font-bold text-foreground">{group?.code}</div>
          </div>

          <Button
            size="sm"
            onClick={() => {
              copyCode();
              setShowQrModal(false);
            }}
            className="w-full bg-brand-500 hover:bg-brand-600 text-white text-xs min-target-size"
          >
            Copy Code & Close
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
