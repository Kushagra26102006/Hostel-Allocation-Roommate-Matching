"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Users, Copy, Check, LogOut, UserPlus, ShieldCheck, Clock, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface GroupMemberData {
  student_id: string;
  email: string;
  status: "pending" | "accepted" | "declined";
}

export interface GroupData {
  _id: string;
  cycle_id: string;
  leader_id: string;
  invite_code: string;
  status: "draft" | "confirmed" | "disbanded";
  members: GroupMemberData[];
}

export function GroupBuilder({
  cycleId,
  initialGroup,
  currentUserId,
}: {
  cycleId: string;
  initialGroup?: GroupData | null;
  currentUserId: string;
}) {
  const [group, setGroup] = useState<GroupData | null>(initialGroup ?? null);
  const [inviteCodeInput, setInviteCodeInput] = useState("");
  const [copiedCode, setCopiedCode] = useState(false);
  const [loading, setLoading] = useState(false);

  const createGroup = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cycle_id: cycleId }),
      });
      const data = await res.json();
      if (res.ok) {
        setGroup(data);
      } else {
        alert(data.detail || "Failed to create group");
      }
    } catch {
      alert("Failed to create group");
    } finally {
      setLoading(false);
    }
  };

  const joinGroup = async () => {
    if (!inviteCodeInput.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/v1/groups/join/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invite_code: inviteCodeInput.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setGroup(data);
        setInviteCodeInput("");
      } else {
        alert(data.detail || "Invalid invite code or group full");
      }
    } catch {
      alert("Failed to join group");
    } finally {
      setLoading(false);
    }
  };

  const acceptInvite = async () => {
    if (!group) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/groups/${group._id}/accept`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setGroup(data);
      }
    } catch {
      alert("Failed to accept invitation");
    } finally {
      setLoading(false);
    }
  };

  const leaveGroup = async () => {
    if (!group) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/groups/${group._id}/leave`, {
        method: "DELETE",
      });
      if (res.ok) {
        setGroup(null);
      }
    } catch {
      alert("Failed to leave group");
    } finally {
      setLoading(false);
    }
  };

  const copyCodeToClipboard = () => {
    if (group?.invite_code) {
      navigator.clipboard.writeText(group.invite_code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const userMember = group?.members.find((m) => m.student_id === currentUserId);

  return (
    <Card className="max-w-3xl mx-auto border-border/60 bg-surface/80 backdrop-blur-md shadow-xl">
      <CardHeader>
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          <Users className="w-5 h-5 text-brand-400" />
          Roommate Group Builder
        </CardTitle>
        <CardDescription>
          Form mutual roommate groups up to 4 members. Groups confirm automatically when all members
          accept.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!group ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Create Group Box */}
            <div className="p-5 rounded-2xl border border-border/60 bg-surface/40 flex flex-col justify-between space-y-4">
              <div>
                <h3 className="font-bold text-base text-text">Create Roommate Group</h3>
                <p className="text-xs text-muted mt-1">
                  Start a group as leader and invite friends using a unique 6-character code.
                </p>
              </div>
              <Button
                onClick={createGroup}
                disabled={loading}
                className="bg-brand-600 hover:bg-brand-700 text-white font-bold w-full"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <UserPlus className="w-4 h-4 mr-2" />
                )}{" "}
                Create Group
              </Button>
            </div>

            {/* Join Group Box */}
            <div className="p-5 rounded-2xl border border-border/60 bg-surface/40 flex flex-col justify-between space-y-4">
              <div>
                <h3 className="font-bold text-base text-text">Join Existing Group</h3>
                <p className="text-xs text-muted mt-1">
                  Enter the 6-character invite code provided by your group leader.
                </p>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. AB12CD"
                  value={inviteCodeInput}
                  onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="font-mono text-center tracking-widest uppercase font-bold"
                />
                <Button
                  onClick={joinGroup}
                  disabled={loading || inviteCodeInput.length < 6}
                  variant="outline"
                >
                  Join
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Group Status Banner */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-surface/60 border border-border/60">
              <div>
                <span className="text-xs text-muted">Invite Code:</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono font-bold text-lg text-brand-400 tracking-wider">
                    {group.invite_code}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={copyCodeToClipboard}
                  >
                    {copiedCode ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-muted" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs text-muted">Group Status:</span>
                <div className="mt-1">
                  <span
                    className={cn(
                      "px-2.5 py-0.5 rounded-full text-xs font-bold uppercase",
                      group.status === "confirmed"
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-amber-500/20 text-amber-400 border border-amber-500/30",
                    )}
                  >
                    {group.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Member Avatar Stack & List */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-muted uppercase tracking-wider">
                Group Members ({group.members.length} / 4 max)
              </h4>

              {/* Avatar Stack Animation */}
              <div className="flex items-center -space-x-3 py-2">
                {group.members.map((member, idx) => (
                  <motion.div
                    key={member.student_id}
                    initial={{ scale: 0, x: -20 }}
                    animate={{ scale: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className={cn(
                      "w-10 h-10 rounded-full border-2 border-surface flex items-center justify-center font-bold text-xs uppercase shadow-md",
                      member.status === "accepted"
                        ? "bg-emerald-600 text-white"
                        : "bg-amber-600 text-white",
                    )}
                    title={`${member.email} (${member.status})`}
                  >
                    {member.email.slice(0, 2)}
                  </motion.div>
                ))}
              </div>

              {/* Members Detail List */}
              <div className="space-y-2">
                {group.members.map((member) => (
                  <div
                    key={member.student_id}
                    className="p-3 rounded-xl border border-border/40 bg-surface/40 flex items-center justify-between text-xs"
                  >
                    <span className="font-medium text-text">{member.email}</span>
                    <div className="flex items-center gap-1.5">
                      {member.status === "accepted" ? (
                        <span className="flex items-center gap-1 text-emerald-400 font-medium">
                          <ShieldCheck className="w-3.5 h-3.5" /> Accepted
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-amber-400 font-medium">
                          <Clock className="w-3.5 h-3.5 animate-pulse" /> Pending
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex justify-between items-center pt-4 border-t border-border/40">
              {userMember?.status === "pending" ? (
                <Button
                  onClick={acceptInvite}
                  disabled={loading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  Accept Invitation
                </Button>
              ) : (
                <div />
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={leaveGroup}
                disabled={loading}
                className="border-rose-500/40 text-rose-400 hover:bg-rose-950/40"
              >
                <LogOut className="w-4 h-4 mr-2" /> Leave Group
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
