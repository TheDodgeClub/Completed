import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMembers } from "@/hooks/use-members";
import { fetchApi } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Search, Star, Loader2, ExternalLink, Users, TrendingUp, Crown, Check, UserPlus, ShieldOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ELITE_PRICE_GBP = 8.99;
const STRIPE_DASHBOARD_BASE = "https://dashboard.stripe.com/subscriptions";

function resolveAvatarUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("/objects/")) return `/api/storage${url}`;
  return url;
}

export default function EliteMembers() {
  const { data: members, isLoading } = useMembers();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [grantDialogOpen, setGrantDialogOpen] = useState(false);
  const [grantSearch, setGrantSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<{ id: number; name: string } | null>(null);

  const eliteMembers = members?.filter(m => m.isElite) ?? [];
  const nonEliteMembers = members?.filter(m => !m.isElite) ?? [];

  const filteredElite = eliteMembers.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.email.toLowerCase().includes(search.toLowerCase())
  );

  const filteredNonElite = nonEliteMembers.filter(m =>
    m.name.toLowerCase().includes(grantSearch.toLowerCase()) ||
    m.email.toLowerCase().includes(grantSearch.toLowerCase())
  );

  const monthlyRevenue = (eliteMembers.length * ELITE_PRICE_GBP).toFixed(2);
  const annualRevenue = (eliteMembers.length * ELITE_PRICE_GBP * 12).toFixed(2);

  const grantMutation = useMutation({
    mutationFn: (userId: number) =>
      fetchApi("/api/admin/elite/grant", { method: "POST", body: JSON.stringify({ userId }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      setGrantDialogOpen(false);
      setGrantSearch("");
      setSelectedUserId(null);
      toast({ title: "Elite granted", description: "The member now has Elite status." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message ?? "Could not grant Elite.", variant: "destructive" });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (userId: number) =>
      fetchApi("/api/admin/elite/revoke", { method: "POST", body: JSON.stringify({ userId }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      setRevokeTarget(null);
      toast({ title: "Elite revoked", description: "The member's Elite status has been removed." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message ?? "Could not revoke Elite.", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-yellow-500/15 border border-yellow-500/25 flex items-center justify-center">
              <Crown className="w-5 h-5 text-yellow-500" />
            </span>
            Elite Members
          </h1>
          <p className="text-muted-foreground mt-1">Members subscribed to the Elite plan at £8.99/month.</p>
        </div>
        <div className="flex gap-2">
          <Button
            className="bg-yellow-500 hover:bg-yellow-400 text-black font-semibold gap-2"
            onClick={() => { setGrantDialogOpen(true); setGrantSearch(""); setSelectedUserId(null); }}
          >
            <UserPlus className="w-4 h-4" />
            Grant Elite
          </Button>
          <Button
            variant="outline"
            className="border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10 gap-2"
            onClick={() => window.open(STRIPE_DASHBOARD_BASE, "_blank")}
          >
            <ExternalLink className="w-4 h-4" />
            Stripe Dashboard
          </Button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card border-border/50 p-5 shadow-lg shadow-black/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/15 flex items-center justify-center">
              <Users className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{eliteMembers.length}</p>
              <p className="text-sm text-muted-foreground">Active Elite Members</p>
            </div>
          </div>
        </Card>
        <Card className="bg-card border-border/50 p-5 shadow-lg shadow-black/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/15 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">£{monthlyRevenue}</p>
              <p className="text-sm text-muted-foreground">Monthly Recurring Revenue</p>
            </div>
          </div>
        </Card>
        <Card className="bg-card border-border/50 p-5 shadow-lg shadow-black/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center">
              <Star className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">£{annualRevenue}</p>
              <p className="text-sm text-muted-foreground">Projected Annual Revenue</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2 bg-card border border-border/50 rounded-xl px-4 py-2 shadow-lg shadow-black/5 w-full max-w-md">
        <Search className="w-5 h-5 text-muted-foreground shrink-0" />
        <Input
          className="border-0 bg-transparent focus-visible:ring-0 px-2 h-10 shadow-none text-foreground"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      {eliteMembers.length === 0 ? (
        <div className="p-16 text-center border-2 border-dashed border-border/50 rounded-2xl">
          <Crown className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-foreground">No Elite Members Yet</h3>
          <p className="text-muted-foreground mt-1 mb-4">Members will appear here after subscribing or being granted Elite status.</p>
          <Button
            className="bg-yellow-500 hover:bg-yellow-400 text-black font-semibold gap-2"
            onClick={() => { setGrantDialogOpen(true); setGrantSearch(""); setSelectedUserId(null); }}
          >
            <UserPlus className="w-4 h-4" />
            Grant Elite to a Member
          </Button>
        </div>
      ) : (
        <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-lg shadow-black/10">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-secondary/50 border-b border-border/50">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-muted-foreground py-4 px-6">Member</TableHead>
                  <TableHead className="text-muted-foreground py-4">Status</TableHead>
                  <TableHead className="text-muted-foreground py-4">Elite Since</TableHead>
                  <TableHead className="text-muted-foreground py-4">Stripe Subscription</TableHead>
                  <TableHead className="text-muted-foreground py-4 text-right px-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredElite.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      No elite members match &quot;{search}&quot;
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredElite.map((member) => (
                    <TableRow key={member.id} className="border-border/50 hover:bg-white/[0.02]">
                      <TableCell className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="relative shrink-0">
                            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center overflow-hidden border border-yellow-500/30">
                              {member.avatarUrl ? (
                                <img src={resolveAvatarUrl(member.avatarUrl)} alt={member.name} className="w-full h-full object-cover" />
                              ) : (
                                <span className="font-bold text-sm">{member.name.charAt(0)}</span>
                              )}
                            </div>
                            <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-yellow-400 border-2 border-card flex items-center justify-center shadow-sm">
                              <Check className="w-2.5 h-2.5 text-yellow-900 stroke-[3]" />
                            </span>
                          </div>
                          <div>
                            <div className="font-semibold text-foreground flex items-center gap-1.5">
                              {member.name}
                              <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                            </div>
                            <div className="text-xs text-muted-foreground">{member.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/25">
                          <Star className="w-3 h-3 mr-1 fill-yellow-500" />
                          Active Elite
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {member.eliteSince
                          ? formatDateTime(member.eliteSince)
                          : <span className="text-muted-foreground/50 italic">—</span>}
                      </TableCell>
                      <TableCell>
                        {member.stripeSubscriptionId ? (
                          <code className="text-xs bg-secondary px-2 py-1 rounded text-muted-foreground font-mono">
                            {member.stripeSubscriptionId}
                          </code>
                        ) : (
                          <span className="text-muted-foreground/50 italic text-sm">Manual grant</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right px-6">
                        <div className="flex items-center justify-end gap-2">
                          {member.stripeSubscriptionId && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-muted-foreground hover:text-yellow-500 hover:bg-yellow-500/10"
                              onClick={() => window.open(`${STRIPE_DASHBOARD_BASE}/${member.stripeSubscriptionId}`, "_blank")}
                            >
                              <ExternalLink className="w-4 h-4 mr-1" />
                              Stripe
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                            onClick={() => setRevokeTarget({ id: member.id, name: member.name })}
                          >
                            <ShieldOff className="w-4 h-4 mr-1" />
                            Revoke
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {filteredElite.length > 0 && (
            <div className="px-6 py-3 border-t border-border/50 bg-secondary/20">
              <p className="text-xs text-muted-foreground">
                {filteredElite.length} of {eliteMembers.length} elite member{eliteMembers.length !== 1 ? "s" : ""} shown
                {eliteMembers.length > 0 && ` · £${monthlyRevenue}/month total`}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Grant Elite Dialog ── */}
      <Dialog open={grantDialogOpen} onOpenChange={setGrantDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-yellow-500" />
              Grant Elite Membership
            </DialogTitle>
            <DialogDescription>
              Select a member to manually grant Elite status. They will receive the 500 XP bonus and all Elite perks immediately.
            </DialogDescription>
          </DialogHeader>

          {/* Search box */}
          <div className="flex items-center gap-2 bg-secondary/50 border border-border/50 rounded-lg px-3 py-2">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none flex-1"
              placeholder="Search members..."
              value={grantSearch}
              onChange={(e) => setGrantSearch(e.target.value)}
              autoFocus
            />
          </div>

          {/* Member list */}
          <div className="max-h-64 overflow-y-auto rounded-lg border border-border/50 divide-y divide-border/30">
            {filteredNonElite.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                {nonEliteMembers.length === 0 ? "All members are already Elite!" : "No members match your search."}
              </div>
            ) : (
              filteredNonElite.map((member) => (
                <button
                  key={member.id}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-yellow-500/5 ${
                    selectedUserId === member.id ? "bg-yellow-500/10 border-l-2 border-yellow-500" : ""
                  }`}
                  onClick={() => setSelectedUserId(member.id === selectedUserId ? null : member.id)}
                >
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center overflow-hidden shrink-0">
                    {member.avatarUrl ? (
                      <img src={resolveAvatarUrl(member.avatarUrl)} alt={member.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-bold text-xs">{member.name.charAt(0)}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{member.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                  </div>
                  {selectedUserId === member.id && (
                    <Check className="w-4 h-4 text-yellow-500 shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setGrantDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-yellow-500 hover:bg-yellow-400 text-black font-semibold gap-2"
              disabled={!selectedUserId || grantMutation.isPending}
              onClick={() => selectedUserId && grantMutation.mutate(selectedUserId)}
            >
              {grantMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Crown className="w-4 h-4" />
              )}
              Grant Elite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Revoke Confirmation Dialog ── */}
      <Dialog open={!!revokeTarget} onOpenChange={(open) => !open && setRevokeTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldOff className="w-5 h-5 text-red-500" />
              Revoke Elite Status
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to remove Elite status from{" "}
              <span className="font-semibold text-foreground">{revokeTarget?.name}</span>?
              {" "}This will remove their Elite badge and perks immediately. If they have an active Stripe subscription, cancel it separately in Stripe.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={revokeMutation.isPending}
              onClick={() => revokeTarget && revokeMutation.mutate(revokeTarget.id)}
            >
              {revokeMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <ShieldOff className="w-4 h-4 mr-2" />
              )}
              Revoke Elite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
