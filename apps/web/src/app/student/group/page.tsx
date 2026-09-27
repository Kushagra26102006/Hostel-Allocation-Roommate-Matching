"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AvatarStack } from "@/components/ui/avatar-stack";
import { StatusBadge } from "@/components/ui/status-badge";
import { useStudentGroup, useInviteGroupMember } from "@/hooks/use-mock-api";
import { Users, Copy, Plus, ShieldCheck, Check } from "lucide-react";
import { toast } from "sonner";

export default function StudentGroupBuilderPage() {
  const { data: group } = useStudentGroup();
  const inviteMutation = useInviteGroupMember();
  const [inviteRoll, setInviteRoll] = React.useState("");
  const [copied, setCopied] = React.useState(false);

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
    if (!inviteRoll.trim()) return;
    inviteMutation.mutate(inviteRoll.trim(), {
      onSuccess: () => {
        toast.success(`Invitation sent to Roll No: ${inviteRoll.trim()}`);
        setInviteRoll("");
      },
    });
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
          <span>Mutual Consent Pairing</span>
        </div>
        <h1 className="mt-2 font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Roommate Group Pairing
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-muted">
          Form a mutual roommate group to be assigned together into a shared room during the
          Gale-Shapley matching run.
        </p>
      </div>

      {/* Group Info Banner Card */}
      {group && (
        <div className="rounded-2xl border border-border/80 bg-surface p-6 shadow-xs">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <AvatarStack avatars={avatars} size="lg" />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-heading text-lg font-bold text-foreground">{group.name}</h3>
                  <StatusBadge status="approved" label="Pair Confirmed" />
                </div>
                <p className="text-xs text-muted mt-0.5">
                  Target Room: Double Sharing AC &bull; {group.members.length} / 2 Members Paired
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl bg-surface-muted/50 p-2.5 px-3 border border-border/70">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-muted tracking-wider">
                  Group Invite Code
                </span>
                <span className="font-mono text-sm font-bold text-foreground">{group.code}</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={copyCode}
                className="h-8 w-8 p-0 shrink-0"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Group Members List */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <h3 className="font-heading text-base font-bold text-foreground">Group Members</h3>
          <span className="text-xs text-muted">Mutual consent required for all members</span>
        </div>

        <div className="space-y-3">
          <AnimatePresence>
            {group?.members.map((member, idx) => (
              <motion.div
                key={member.studentId || idx}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="rounded-xl border border-border/70 bg-surface p-4 sm:p-5 shadow-xs transition-all duration-180 hover:border-brand-500/40"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <img
                      src={member.avatarUrl}
                      alt={member.name}
                      className="h-10 w-10 rounded-full object-cover border border-border/60 shrink-0"
                    />
                    <div className="min-w-0 truncate">
                      <div className="flex items-center gap-2">
                        <span className="font-heading text-sm font-bold text-foreground truncate">
                          {member.name}
                        </span>
                        {member.isLeader && (
                          <span className="rounded-md bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-700 dark:bg-brand-950/40 dark:text-brand-300">
                            Leader
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted font-mono truncate">
                        {member.rollNo} &bull; {member.email}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {member.compatibilityScore && (
                      <div className="text-right hidden sm:block">
                        <span className="text-[10px] uppercase font-bold text-muted">
                          Compatibility
                        </span>
                        <div className="font-heading text-sm font-bold text-emerald-600 dark:text-emerald-400">
                          {member.compatibilityScore}%
                        </div>
                      </div>
                    )}
                    <StatusBadge
                      status={member.status === "accepted" ? "approved" : "under_review"}
                      label={member.status === "accepted" ? "Joined" : "Invite Sent"}
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Invite Member Form */}
      <div className="rounded-2xl border border-border/80 bg-surface p-6 shadow-xs">
        <h3 className="font-heading text-base font-bold text-foreground">
          Invite Roommate to Group
        </h3>
        <p className="mt-1 text-xs text-muted">
          Enter their university Roll Number to send an in-app roommate invitation.
        </p>

        <form onSubmit={handleInvite} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Input
            value={inviteRoll}
            onChange={(e) => setInviteRoll(e.target.value)}
            placeholder="e.g. 23CS10088"
            className="font-mono uppercase text-xs"
          />
          <Button
            type="submit"
            disabled={inviteMutation.isPending || !inviteRoll.trim()}
            className="sm:w-36 bg-brand-500 hover:bg-brand-600 text-white font-semibold shadow-xs"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            {inviteMutation.isPending ? "Sending..." : "Send Invite"}
          </Button>
        </form>

        <div className="mt-4 flex items-center gap-2 text-[11px] text-muted border-t border-border/50 pt-3">
          <ShieldCheck className="h-4 w-4 text-brand-600 shrink-0" />
          <span>
            Both students must mutually accept the invitation before the preference lock deadline.
          </span>
        </div>
      </div>
    </div>
  );
}
