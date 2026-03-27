import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useMembers, useMemberAttendance, useMemberAwards,
  useMarkAttendance, useDeleteAttendance, useGrantAward, useRevokeAward,
  useUpdateMember, useDeleteMember, AdminMember,
} from "@/hooks/use-members";
import { useEvents } from "@/hooks/use-events";
import { fetchApi } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Search, Trophy, CalendarCheck, Trash2, ShieldCheck, Loader2, CircleDot,
  Pencil, Check, Star, Heart, Copy, Crown, Users, TrendingUp,
  ExternalLink, UserPlus, ShieldOff,
} from "lucide-react";

const LEVEL_NAMES = ["Beginner", "Developing", "Experienced", "Skilled", "Advanced", "Pro", "League", "Expert", "Master", "Icon"];
const ELITE_PRICE_GBP = 8.99;
const STRIPE_DASHBOARD_BASE = "https://dashboard.stripe.com/subscriptions";

function resolveAvatarUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("/objects/")) return `/api/storage${url}`;
  return url;
}

function Avatar({ member }: { member: { name: string; avatarUrl?: string | null; isElite?: boolean } }) {
  return (
    <div className="relative shrink-0">
      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center overflow-hidden border border-border/50">
        {member.avatarUrl ? (
          <img src={resolveAvatarUrl(member.avatarUrl)} alt={member.name} className="w-full h-full object-cover" />
        ) : (
          <span className="font-bold text-sm">{member.name.charAt(0)}</span>
        )}
      </div>
      {member.isElite && (
        <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-yellow-400 border-2 border-card flex items-center justify-center shadow-sm">
          <Check className="w-2.5 h-2.5 text-yellow-900 stroke-[3]" />
        </span>
      )}
    </div>
  );
}

function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="flex items-center gap-2 bg-card border border-border/50 rounded-xl px-4 py-2 shadow-lg shadow-black/5 w-full max-w-md">
      <Search className="w-5 h-5 text-muted-foreground shrink-0" />
      <Input
        className="border-0 bg-transparent focus-visible:ring-0 px-2 h-10 shadow-none text-foreground"
        placeholder={placeholder ?? "Search by name or email…"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

/* ─── PLAYERS TAB ─────────────────────────────────────────────── */

export default function Members() {
  const { data: members, isLoading } = useMembers();
  const { toast } = useToast();

  const players = members?.filter(m => m.accountType === "player" || !m.accountType) ?? [];
  const supporters = members?.filter(m => m.accountType === "supporter") ?? [];
  const eliteMembers = members?.filter(m => m.isElite) ?? [];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Members</h1>
        <p className="text-muted-foreground mt-1">
          Manage all {isLoading ? "…" : (members?.length ?? 0)} members — players, supporters and elite.
        </p>
      </div>

      <Tabs defaultValue="players">
        <TabsList className="bg-secondary/50 border border-border/50">
          <TabsTrigger value="players" className="gap-2">
            <Users className="w-4 h-4" />
            Players
            {!isLoading && <span className="ml-1 text-xs opacity-60">{players.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="supporters" className="gap-2">
            <Heart className="w-4 h-4" />
            Supporters
            {!isLoading && <span className="ml-1 text-xs opacity-60">{supporters.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="elite" className="gap-2">
            <Crown className="w-4 h-4" />
            Elite
            {!isLoading && <span className="ml-1 text-xs opacity-60">{eliteMembers.length}</span>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="players" className="mt-6">
          <PlayersTab members={members} isLoading={isLoading} toast={toast} />
        </TabsContent>
        <TabsContent value="supporters" className="mt-6">
          <SupportersTab members={members} isLoading={isLoading} toast={toast} />
        </TabsContent>
        <TabsContent value="elite" className="mt-6">
          <EliteTab members={members} isLoading={isLoading} toast={toast} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ─── Players Tab ─── */
function PlayersTab({ members, isLoading, toast }: { members: AdminMember[] | undefined; isLoading: boolean; toast: any }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<AdminMember | null>(null);

  const filtered = members?.filter(m =>
    (m.accountType === "player" || !m.accountType) &&
    (m.name.toLowerCase().includes(search.toLowerCase()) || m.email.toLowerCase().includes(search.toLowerCase()))
  ) ?? [];

  return (
    <div className="space-y-4">
      <SearchBar value={search} onChange={setSearch} />
      <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-lg shadow-black/10">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-secondary/50 border-b border-border/50">
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-muted-foreground py-4 px-6">Member</TableHead>
                <TableHead className="text-muted-foreground py-4">Status</TableHead>
                <TableHead className="text-muted-foreground py-4 text-center">Events</TableHead>
                <TableHead className="text-muted-foreground py-4 text-center">Medals</TableHead>
                <TableHead className="text-muted-foreground py-4 text-center">Rings</TableHead>
                <TableHead className="text-muted-foreground py-4 text-right px-6">Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />Loading…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground">No players found{search ? ` matching "${search}"` : ""}.</TableCell></TableRow>
              ) : filtered.map((m) => (
                <TableRow key={m.id} className="group cursor-pointer hover:bg-white/[0.02] border-border/50 transition-colors" onClick={() => setSelected(m)}>
                  <TableCell className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar member={m} />
                      <div>
                        <div className="font-semibold text-foreground group-hover:text-primary transition-colors">{m.name}</div>
                        <div className="text-xs text-muted-foreground">{m.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1.5">
                      {m.isAdmin
                        ? <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20"><ShieldCheck className="w-3 h-3 mr-1" />Admin</Badge>
                        : <Badge variant="outline" className="bg-secondary/50 text-muted-foreground border-border/50">Member</Badge>}
                      {m.isElite && <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20"><Star className="w-3 h-3 mr-1" />Elite</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="inline-flex items-center justify-center min-w-[2.5rem] px-2 py-1 rounded-md bg-secondary text-foreground font-semibold">{m.eventsAttended}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="inline-flex items-center gap-1.5 min-w-[3rem] justify-center px-2 py-1 rounded-md bg-accent/10 text-accent font-semibold border border-accent/20"><Trophy className="w-3.5 h-3.5" />{m.medalsEarned}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="inline-flex items-center gap-1.5 min-w-[3rem] justify-center px-2 py-1 rounded-md bg-violet-500/10 text-violet-400 font-semibold border border-violet-500/20"><CircleDot className="w-3.5 h-3.5" />{m.ringsEarned ?? 0}</span>
                  </TableCell>
                  <TableCell className="px-6 text-sm text-muted-foreground text-right">{formatDateTime(m.memberSince).split(" at ")[0]}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      <PlayerDetailSheet member={selected} onClose={() => setSelected(null)} toast={toast} />
    </div>
  );
}

/* ─── Supporters Tab ─── */
function SupportersTab({ members, isLoading, toast }: { members: AdminMember[] | undefined; isLoading: boolean; toast: any }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<AdminMember | null>(null);

  const filtered = members?.filter(m =>
    m.accountType === "supporter" &&
    (m.name.toLowerCase().includes(search.toLowerCase()) || m.email.toLowerCase().includes(search.toLowerCase()))
  ) ?? [];

  return (
    <div className="space-y-4">
      <SearchBar value={search} onChange={setSearch} />
      <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-lg shadow-black/10">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-secondary/50 border-b border-border/50">
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-muted-foreground py-4 px-6">Supporter</TableHead>
                <TableHead className="text-muted-foreground py-4">Status</TableHead>
                <TableHead className="text-muted-foreground py-4">Referral Code</TableHead>
                <TableHead className="text-muted-foreground py-4 text-right px-6">Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={4} className="h-32 text-center text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />Loading…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="h-32 text-center text-muted-foreground">No supporters{search ? ` matching "${search}"` : " yet"}.</TableCell></TableRow>
              ) : filtered.map((s) => (
                <TableRow key={s.id} className="group cursor-pointer hover:bg-white/[0.02] border-border/50 transition-colors" onClick={() => setSelected(s)}>
                  <TableCell className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar member={s} />
                      <div>
                        <div className="font-semibold text-foreground group-hover:text-pink-400 transition-colors">{s.name}</div>
                        <div className="text-xs text-muted-foreground">{s.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="outline" className="bg-pink-500/10 text-pink-400 border-pink-500/20"><Heart className="w-3 h-3 mr-1" />Supporter</Badge>
                      {s.isElite && <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20"><Star className="w-3 h-3 mr-1" />Elite</Badge>}
                    </div>
                  </TableCell>
                  <TableCell>
                    {s.referralCode
                      ? <span className="font-mono text-sm tracking-widest text-foreground bg-secondary/60 px-2 py-0.5 rounded-md border border-border/50">{s.referralCode}</span>
                      : <span className="text-muted-foreground text-xs">—</span>}
                  </TableCell>
                  <TableCell className="px-6 text-sm text-muted-foreground text-right">{formatDateTime(s.memberSince).split(" at ")[0]}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      <SupporterDetailSheet supporter={selected} onClose={() => setSelected(null)} toast={toast} />
    </div>
  );
}

/* ─── Elite Tab ─── */
function EliteTab({ members, isLoading, toast }: { members: AdminMember[] | undefined; isLoading: boolean; toast: any }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [grantOpen, setGrantOpen] = useState(false);
  const [grantSearch, setGrantSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<{ id: number; name: string } | null>(null);

  const eliteMembers = members?.filter(m => m.isElite) ?? [];
  const nonEliteMembers = members?.filter(m => !m.isElite) ?? [];
  const filteredElite = eliteMembers.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) || m.email.toLowerCase().includes(search.toLowerCase())
  );
  const filteredNonElite = nonEliteMembers.filter(m =>
    m.name.toLowerCase().includes(grantSearch.toLowerCase()) || m.email.toLowerCase().includes(grantSearch.toLowerCase())
  );

  const monthlyRevenue = (eliteMembers.length * ELITE_PRICE_GBP).toFixed(2);

  const grantMutation = useMutation({
    mutationFn: (userId: number) => fetchApi("/api/admin/elite/grant", { method: "POST", body: JSON.stringify({ userId }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      setGrantOpen(false); setGrantSearch(""); setSelectedUserId(null);
      toast({ title: "Elite granted", description: "The member now has Elite status." });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message ?? "Could not grant Elite.", variant: "destructive" }),
  });

  const revokeMutation = useMutation({
    mutationFn: (userId: number) => fetchApi("/api/admin/elite/revoke", { method: "POST", body: JSON.stringify({ userId }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      setRevokeTarget(null);
      toast({ title: "Elite revoked" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message ?? "Could not revoke Elite.", variant: "destructive" }),
  });

  return (
    <div className="space-y-5">
      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: Users, color: "text-yellow-500", bg: "bg-yellow-500/15", label: "Active Elite Members", value: eliteMembers.length },
          { icon: TrendingUp, color: "text-green-500", bg: "bg-green-500/15", label: "Monthly Revenue", value: `£${monthlyRevenue}` },
          { icon: Star, color: "text-blue-400", bg: "bg-blue-400/15", label: "Annual Projected", value: `£${(eliteMembers.length * ELITE_PRICE_GBP * 12).toFixed(2)}` },
        ].map(s => (
          <Card key={s.label} className="bg-card border-border/50 p-4 shadow-lg shadow-black/10">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{isLoading ? "…" : s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Header row */}
      <div className="flex flex-wrap items-center gap-3">
        <SearchBar value={search} onChange={setSearch} />
        <Button
          className="bg-yellow-500 hover:bg-yellow-400 text-black font-semibold gap-2 ml-auto"
          onClick={() => { setGrantOpen(true); setGrantSearch(""); setSelectedUserId(null); }}
        >
          <UserPlus className="w-4 h-4" /> Grant Elite
        </Button>
        <Button variant="outline" className="border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10 gap-2" onClick={() => window.open(STRIPE_DASHBOARD_BASE, "_blank")}>
          <ExternalLink className="w-4 h-4" /> Stripe
        </Button>
      </div>

      {eliteMembers.length === 0 && !isLoading ? (
        <div className="p-16 text-center border-2 border-dashed border-border/50 rounded-2xl">
          <Crown className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-foreground">No Elite Members Yet</h3>
          <p className="text-muted-foreground mt-1 mb-4">Members will appear here after subscribing or being granted Elite status.</p>
          <Button className="bg-yellow-500 hover:bg-yellow-400 text-black font-semibold gap-2" onClick={() => setGrantOpen(true)}>
            <UserPlus className="w-4 h-4" /> Grant Elite to a Member
          </Button>
        </div>
      ) : (
        <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-lg shadow-black/10">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-secondary/50 border-b border-border/50">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-muted-foreground py-4 px-6">Member</TableHead>
                  <TableHead className="text-muted-foreground py-4">Elite Since</TableHead>
                  <TableHead className="text-muted-foreground py-4">Subscription</TableHead>
                  <TableHead className="text-muted-foreground py-4 text-right px-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={4} className="h-32 text-center text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />Loading…</TableCell></TableRow>
                ) : filteredElite.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">No elite members match "{search}"</TableCell></TableRow>
                ) : filteredElite.map((m) => (
                  <TableRow key={m.id} className="border-border/50 hover:bg-white/[0.02]">
                    <TableCell className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center overflow-hidden border border-yellow-500/30">
                            {m.avatarUrl ? <img src={resolveAvatarUrl(m.avatarUrl)} alt={m.name} className="w-full h-full object-cover" /> : <span className="font-bold text-sm">{m.name.charAt(0)}</span>}
                          </div>
                          <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-yellow-400 border-2 border-card flex items-center justify-center shadow-sm">
                            <Check className="w-2.5 h-2.5 text-yellow-900 stroke-[3]" />
                          </span>
                        </div>
                        <div>
                          <div className="font-semibold text-foreground flex items-center gap-1.5">{m.name}<Star className="w-3 h-3 text-yellow-500 fill-yellow-500" /></div>
                          <div className="text-xs text-muted-foreground">{m.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {m.eliteSince ? formatDateTime(m.eliteSince) : <span className="text-muted-foreground/50 italic">—</span>}
                    </TableCell>
                    <TableCell>
                      {m.stripeSubscriptionId
                        ? <code className="text-xs bg-secondary px-2 py-1 rounded text-muted-foreground font-mono">{m.stripeSubscriptionId}</code>
                        : <span className="text-muted-foreground/50 italic text-sm">Manual grant</span>}
                    </TableCell>
                    <TableCell className="text-right px-6">
                      <div className="flex items-center justify-end gap-2">
                        {m.stripeSubscriptionId && (
                          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-yellow-500 hover:bg-yellow-500/10" onClick={() => window.open(`${STRIPE_DASHBOARD_BASE}/${m.stripeSubscriptionId}`, "_blank")}>
                            <ExternalLink className="w-4 h-4 mr-1" />Stripe
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-red-500 hover:bg-red-500/10" onClick={() => setRevokeTarget({ id: m.id, name: m.name })}>
                          <ShieldOff className="w-4 h-4 mr-1" />Revoke
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Grant dialog */}
      <Dialog open={grantOpen} onOpenChange={setGrantOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Crown className="w-5 h-5 text-yellow-500" />Grant Elite Membership</DialogTitle>
            <DialogDescription>Select a member to manually grant Elite status.</DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 bg-secondary/50 border border-border/50 rounded-lg px-3 py-2">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none flex-1" placeholder="Search members…" value={grantSearch} onChange={(e) => setGrantSearch(e.target.value)} autoFocus />
          </div>
          <div className="max-h-64 overflow-y-auto rounded-lg border border-border/50 divide-y divide-border/30">
            {filteredNonElite.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">{nonEliteMembers.length === 0 ? "All members are already Elite!" : "No members match."}</div>
            ) : filteredNonElite.map((m) => (
              <button key={m.id} className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-yellow-500/5 ${selectedUserId === m.id ? "bg-yellow-500/10 border-l-2 border-yellow-500" : ""}`} onClick={() => setSelectedUserId(m.id === selectedUserId ? null : m.id)}>
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center overflow-hidden shrink-0">
                  {m.avatarUrl ? <img src={resolveAvatarUrl(m.avatarUrl)} alt={m.name} className="w-full h-full object-cover" /> : <span className="font-bold text-xs">{m.name.charAt(0)}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{m.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                </div>
                {selectedUserId === m.id && <Check className="w-4 h-4 text-yellow-500 shrink-0" />}
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGrantOpen(false)}>Cancel</Button>
            <Button className="bg-yellow-500 hover:bg-yellow-400 text-black font-semibold gap-2" disabled={!selectedUserId || grantMutation.isPending} onClick={() => selectedUserId && grantMutation.mutate(selectedUserId)}>
              {grantMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crown className="w-4 h-4" />}Grant Elite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke dialog */}
      <Dialog open={!!revokeTarget} onOpenChange={(open) => !open && setRevokeTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ShieldOff className="w-5 h-5 text-red-500" />Revoke Elite Status</DialogTitle>
            <DialogDescription>Remove Elite status from <span className="font-semibold text-foreground">{revokeTarget?.name}</span>? Their perks are removed immediately. Cancel any Stripe subscription separately.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeTarget(null)}>Cancel</Button>
            <Button variant="destructive" disabled={revokeMutation.isPending} onClick={() => revokeTarget && revokeMutation.mutate(revokeTarget.id)}>
              {revokeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ShieldOff className="w-4 h-4 mr-2" />}Revoke
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── Player Detail Sheet ─── */
function PlayerDetailSheet({ member, onClose, toast }: { member: AdminMember | null; onClose: () => void; toast: any }) {
  const { data: attendance, isLoading: loadingAttendance } = useMemberAttendance(member?.id ?? null);
  const { data: awards, isLoading: loadingAwards } = useMemberAwards(member?.id ?? null);
  const { data: events } = useEvents();
  const { mutate: markAttendance, isPending: marking } = useMarkAttendance();
  const { mutate: deleteAttendance, isPending: deleting } = useDeleteAttendance();
  const { mutate: grantAward, isPending: granting } = useGrantAward();
  const { mutate: revokeAward, isPending: revoking } = useRevokeAward();
  const { mutate: updateMember, isPending: updatingProfile } = useUpdateMember();
  const { mutate: deleteMember, isPending: deletingMember } = useDeleteMember();

  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => { setConfirmDelete(false); }, [member?.id]);
  const [selectedEvent, setSelectedEvent] = useState("");
  const [earnedMedal, setEarnedMedal] = useState(false);
  const [awardNote, setAwardNote] = useState("");
  const [editName, setEditName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editMemberSince, setEditMemberSince] = useState("");
  const [profileExpanded, setProfileExpanded] = useState(false);

  const levelName = LEVEL_NAMES[(member?.level ?? 1) - 1] ?? "Player";

  const handleAddAttendance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!member || !selectedEvent) return;
    markAttendance({ userId: member.id, eventId: Number(selectedEvent), earnedMedal }, {
      onSuccess: () => { toast({ title: "Attendance recorded" }); setSelectedEvent(""); setEarnedMedal(false); },
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
  };

  const handleGrant = (type: "medal" | "ring") => {
    if (!member) return;
    grantAward({ userId: member.id, type, note: awardNote || undefined }, {
      onSuccess: () => { toast({ title: `${type === "medal" ? "Medal" : "Ring"} awarded` }); setAwardNote(""); },
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!member) return;
    updateMember({ id: member.id, data: { name: editName, username: editUsername || undefined, bio: editBio || undefined, memberSince: editMemberSince || undefined } }, {
      onSuccess: () => { toast({ title: "Profile updated" }); setProfileExpanded(false); },
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
  };

  const handleDeleteMember = () => {
    if (!member) return;
    deleteMember(member.id, {
      onSuccess: () => { toast({ title: `${member.name} removed` }); setConfirmDelete(false); onClose(); },
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
  };

  return (
    <Sheet open={!!member} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-lg border-l border-border bg-card/95 backdrop-blur-xl p-0 flex flex-col">
        {member && (
          <>
            <div className="p-6 border-b border-border/50 bg-background/50">
              <SheetHeader className="text-left space-y-0">
                <div className="flex items-center gap-4 mb-4">
                  <div className="relative flex-shrink-0">
                    <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center overflow-hidden border-2 border-border">
                      {member.avatarUrl ? <img src={resolveAvatarUrl(member.avatarUrl)} alt={member.name} className="w-full h-full object-cover" /> : <span className="font-display font-bold text-2xl text-muted-foreground">{member.name.charAt(0)}</span>}
                    </div>
                    {member.isElite && <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-yellow-400 border-2 border-card flex items-center justify-center shadow-md"><Check className="w-3 h-3 text-yellow-900 stroke-[3]" /></span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <SheetTitle className="font-display text-xl text-foreground">{member.name}</SheetTitle>
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-accent/20 text-accent border border-accent/30 rounded">LV {member.level ?? 1}</span>
                      <span className="text-xs text-muted-foreground">{levelName}</span>
                    </div>
                    {member.username && <p className="text-xs text-primary/70 font-medium">@{member.username}</p>}
                    <SheetDescription className="text-muted-foreground text-xs truncate">{member.email}</SheetDescription>
                  </div>
                </div>
                {member.bio && <p className="text-xs text-muted-foreground bg-secondary/30 rounded-lg px-3 py-2 mb-3 border border-border/30">{member.bio}</p>}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: "Events", value: member.eventsAttended, color: "text-foreground", bg: "bg-secondary/50", border: "border-border/50" },
                    { label: "Medals", value: member.medalsEarned, color: "text-accent", bg: "bg-accent/5", border: "border-accent/20" },
                    { label: "Rings", value: member.ringsEarned ?? 0, color: "text-violet-400", bg: "bg-violet-500/5", border: "border-violet-500/20" },
                    { label: "XP", value: (member.xp ?? 0).toLocaleString(), color: "text-blue-400", bg: "bg-blue-500/5", border: "border-blue-500/20" },
                  ].map(s => (
                    <div key={s.label} className={`${s.bg} rounded-xl p-2.5 border ${s.border} text-center`}>
                      <p className={`text-[10px] font-medium mb-0.5 ${s.color}/80`}>{s.label}</p>
                      <p className={`text-lg font-display font-bold ${s.color}`}>{s.value}</p>
                    </div>
                  ))}
                </div>
              </SheetHeader>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Edit Profile */}
              <div className="space-y-3">
                <button onClick={() => { setProfileExpanded(!profileExpanded); if (!profileExpanded) { setEditName(member.name); setEditUsername(member.username ?? ""); setEditBio(member.bio ?? ""); setEditMemberSince(member.memberSince ? member.memberSince.split("T")[0] : ""); } }} className="w-full flex items-center justify-between text-left">
                  <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2"><Pencil className="w-5 h-5 text-muted-foreground" />Edit Profile</h3>
                  <span className="text-xs text-muted-foreground">{profileExpanded ? "▲ Close" : "▼ Expand"}</span>
                </button>
                {profileExpanded && (
                  <form onSubmit={handleSaveProfile} className="bg-secondary/20 border border-border/50 p-4 rounded-2xl space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1"><Label className="text-xs">Display Name</Label><Input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Name" className="bg-background border-border rounded-xl text-sm" /></div>
                      <div className="space-y-1"><Label className="text-xs">Username</Label><Input value={editUsername} onChange={e => setEditUsername(e.target.value)} placeholder="@username" className="bg-background border-border rounded-xl text-sm" /></div>
                    </div>
                    <div className="space-y-1"><Label className="text-xs">Bio</Label><Textarea value={editBio} onChange={e => setEditBio(e.target.value)} placeholder="Member bio…" rows={2} className="bg-background border-border rounded-xl text-sm resize-none" /></div>
                    <div className="space-y-1">
                      <Label className="text-xs">Member Since</Label>
                      <input type="date" value={editMemberSince} onChange={e => setEditMemberSince(e.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    </div>
                    <Button type="submit" disabled={updatingProfile} className="w-full rounded-xl bg-primary hover:bg-primary/90 text-white">{updatingProfile ? "Saving…" : "Save Profile"}</Button>
                  </form>
                )}
              </div>

              {/* Award Medals & Rings */}
              <div className="space-y-4">
                <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2"><Trophy className="w-5 h-5 text-accent" />Award Medals & Rings</h3>
                <div className="bg-secondary/20 border border-border/50 p-4 rounded-2xl space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Optional note</Label>
                    <Input placeholder="e.g. Championship win, Season MVP…" value={awardNote} onChange={(e) => setAwardNote(e.target.value)} className="bg-background border-border rounded-xl text-sm" />
                  </div>
                  <div className="flex gap-2">
                    <Button className="flex-1 rounded-xl bg-accent text-accent-foreground hover:bg-accent/90 font-bold gap-2" onClick={() => handleGrant("medal")} disabled={granting}><Trophy className="w-4 h-4" />Award Medal</Button>
                    <Button className="flex-1 rounded-xl bg-violet-600 text-white hover:bg-violet-700 font-bold gap-2" onClick={() => handleGrant("ring")} disabled={granting}><CircleDot className="w-4 h-4" />Award Ring</Button>
                  </div>
                </div>
                {loadingAwards ? (
                  <div className="text-center py-4 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin mx-auto" /></div>
                ) : awards && awards.length > 0 ? (
                  <div className="space-y-2">
                    {awards.map((award) => (
                      <div key={award.id} className="flex items-center justify-between px-4 py-3 bg-background border border-border/50 rounded-xl group hover:border-primary/30 transition-colors">
                        <div className="flex items-center gap-2.5">
                          {award.type === "medal"
                            ? <span className="flex items-center text-accent bg-accent/10 px-2 py-0.5 rounded-md text-xs font-bold border border-accent/20 gap-1"><Trophy className="w-3 h-3" />Medal</span>
                            : <span className="flex items-center text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-md text-xs font-bold border border-violet-500/20 gap-1"><CircleDot className="w-3 h-3" />Ring</span>}
                          <div>
                            {award.note && <div className="text-xs font-medium text-foreground">{award.note}</div>}
                            <div className="text-[10px] text-muted-foreground">{formatDateTime(award.awardedAt).split(" at ")[0]}</div>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all" onClick={() => revokeAward({ id: award.id, userId: member.id })} disabled={revoking}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              {/* Attendance */}
              <div className="space-y-4">
                <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2"><CalendarCheck className="w-5 h-5 text-primary" />Attendance</h3>
                <form onSubmit={handleAddAttendance} className="bg-secondary/20 border border-border/50 p-4 rounded-2xl space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Select event</Label>
                    <select value={selectedEvent} onChange={e => setSelectedEvent(e.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
                      <option value="">Choose an event…</option>
                      {events?.map(ev => <option key={ev.id} value={ev.id}>{ev.title} — {new Date(ev.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id="earnedMedal" checked={earnedMedal} onCheckedChange={(v) => setEarnedMedal(!!v)} />
                    <Label htmlFor="earnedMedal" className="text-sm cursor-pointer">Earned a medal at this event</Label>
                  </div>
                  <Button type="submit" disabled={!selectedEvent || marking} size="sm" className="w-full rounded-xl gap-2"><CalendarCheck className="w-4 h-4" />{marking ? "Recording…" : "Record Attendance"}</Button>
                </form>
                {loadingAttendance ? (
                  <div className="text-center py-4 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin mx-auto" /></div>
                ) : attendance && attendance.length > 0 ? (
                  <div className="space-y-2">
                    {attendance.map((rec) => (
                      <div key={rec.id} className="flex items-center justify-between px-4 py-3 bg-background border border-border/50 rounded-xl group hover:border-primary/30 transition-colors">
                        <div>
                          <p className="text-sm font-medium text-foreground">{rec.eventTitle}</p>
                          <p className="text-xs text-muted-foreground">{formatDateTime(rec.attendedAt)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {rec.earnedMedal && <span className="text-xs text-accent font-bold bg-accent/10 px-2 py-0.5 rounded-md border border-accent/20">🏅 Medal</span>}
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all" onClick={() => deleteAttendance(rec.id)} disabled={deleting}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No attendance records yet.</p>
                )}
              </div>

              {/* Danger Zone */}
              <div className="border border-destructive/30 rounded-2xl p-4 bg-destructive/5">
                <h3 className="font-display font-bold text-sm text-destructive mb-2 flex items-center gap-2"><Trash2 className="w-4 h-4" />Danger Zone</h3>
                {!confirmDelete ? (
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">Permanently remove this member and all their data.</p>
                    <Button variant="outline" size="sm" className="ml-3 shrink-0 border-destructive/40 text-destructive hover:bg-destructive hover:text-white" onClick={() => setConfirmDelete(true)}>Delete</Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-destructive font-medium">This will permanently delete <span className="font-bold">{member.name}</span> and all their data.</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="destructive" onClick={handleDeleteMember} disabled={deletingMember} className="flex-1">{deletingMember && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Yes, delete</Button>
                      <Button size="sm" variant="outline" onClick={() => setConfirmDelete(false)} disabled={deletingMember} className="flex-1 border-border/50">Cancel</Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

/* ─── Supporter Detail Sheet ─── */
function SupporterDetailSheet({ supporter, onClose, toast }: { supporter: AdminMember | null; onClose: () => void; toast: any }) {
  const { mutate: updateMember, isPending: updatingProfile } = useUpdateMember();
  const { mutate: deleteMember, isPending: deletingMember } = useDeleteMember();

  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => { setConfirmDelete(false); }, [supporter?.id]);
  const [editName, setEditName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editMemberSince, setEditMemberSince] = useState("");
  const [profileExpanded, setProfileExpanded] = useState(false);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supporter) return;
    updateMember({ id: supporter.id, data: { name: editName, username: editUsername || undefined, bio: editBio || undefined, memberSince: editMemberSince || undefined } }, {
      onSuccess: () => { toast({ title: "Profile updated" }); setProfileExpanded(false); },
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
  };

  const handleCopyReferral = () => {
    if (supporter?.referralCode) { navigator.clipboard.writeText(supporter.referralCode); toast({ title: "Referral code copied" }); }
  };

  return (
    <Sheet open={!!supporter} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-lg border-l border-border bg-card/95 backdrop-blur-xl p-0 flex flex-col">
        {supporter && (
          <>
            <div className="p-6 border-b border-border/50 bg-background/50">
              <SheetHeader className="text-left space-y-0">
                <div className="flex items-center gap-4 mb-4">
                  <div className="relative flex-shrink-0">
                    <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center overflow-hidden border-2 border-border">
                      {supporter.avatarUrl ? <img src={resolveAvatarUrl(supporter.avatarUrl)} alt={supporter.name} className="w-full h-full object-cover" /> : <span className="font-display font-bold text-2xl text-muted-foreground">{supporter.name.charAt(0)}</span>}
                    </div>
                    {supporter.isElite && <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-yellow-400 border-2 border-card flex items-center justify-center shadow-md"><Check className="w-3 h-3 text-yellow-900 stroke-[3]" /></span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <SheetTitle className="font-display text-xl text-foreground">{supporter.name}</SheetTitle>
                      <Badge variant="outline" className="bg-pink-500/10 text-pink-400 border-pink-500/20 text-[10px]"><Heart className="w-2.5 h-2.5 mr-1" />Supporter</Badge>
                    </div>
                    {supporter.username && <p className="text-xs text-primary/70 font-medium">@{supporter.username}</p>}
                    <SheetDescription className="text-muted-foreground text-xs truncate">{supporter.email}</SheetDescription>
                  </div>
                </div>
                {supporter.bio && <p className="text-xs text-muted-foreground bg-secondary/30 rounded-lg px-3 py-2 mb-3 border border-border/30">{supporter.bio}</p>}
              </SheetHeader>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {supporter.referralCode && (
                <div className="space-y-3">
                  <h3 className="font-display font-bold text-lg text-foreground">Referral Code</h3>
                  <div className="bg-secondary/20 border border-border/50 p-4 rounded-2xl flex items-center justify-between gap-3">
                    <span className="font-mono text-xl font-bold tracking-[0.3em] text-foreground">{supporter.referralCode}</span>
                    <Button variant="outline" size="sm" onClick={handleCopyReferral} className="shrink-0 gap-1.5 text-xs"><Copy className="w-3.5 h-3.5" />Copy</Button>
                  </div>
                  <p className="text-xs text-muted-foreground">This code brings new members into the club.</p>
                </div>
              )}

              <div className="space-y-3">
                <button onClick={() => { setProfileExpanded(!profileExpanded); if (!profileExpanded) { setEditName(supporter.name); setEditUsername(supporter.username ?? ""); setEditBio(supporter.bio ?? ""); setEditMemberSince(supporter.memberSince ? supporter.memberSince.split("T")[0] : ""); } }} className="w-full flex items-center justify-between text-left">
                  <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2"><Pencil className="w-5 h-5 text-muted-foreground" />Edit Profile</h3>
                  <span className="text-xs text-muted-foreground">{profileExpanded ? "▲ Close" : "▼ Expand"}</span>
                </button>
                {profileExpanded && (
                  <form onSubmit={handleSaveProfile} className="bg-secondary/20 border border-border/50 p-4 rounded-2xl space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1"><Label className="text-xs">Display Name</Label><Input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Name" className="bg-background border-border rounded-xl text-sm" /></div>
                      <div className="space-y-1"><Label className="text-xs">Username</Label><Input value={editUsername} onChange={e => setEditUsername(e.target.value)} placeholder="@username" className="bg-background border-border rounded-xl text-sm" /></div>
                    </div>
                    <div className="space-y-1"><Label className="text-xs">Bio</Label><Textarea value={editBio} onChange={e => setEditBio(e.target.value)} placeholder="Supporter bio…" rows={2} className="bg-background border-border rounded-xl text-sm resize-none" /></div>
                    <div className="space-y-1">
                      <Label className="text-xs">Member Since</Label>
                      <input type="date" value={editMemberSince} onChange={e => setEditMemberSince(e.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    </div>
                    <Button type="submit" disabled={updatingProfile} className="w-full rounded-xl bg-primary hover:bg-primary/90 text-white">{updatingProfile ? "Saving…" : "Save Profile"}</Button>
                  </form>
                )}
              </div>

              <div className="border border-destructive/30 rounded-2xl p-4 bg-destructive/5">
                <h3 className="font-display font-bold text-sm text-destructive mb-2 flex items-center gap-2"><Trash2 className="w-4 h-4" />Danger Zone</h3>
                {!confirmDelete ? (
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">Permanently remove this supporter and all their data.</p>
                    <Button variant="outline" size="sm" className="ml-3 shrink-0 border-destructive/40 text-destructive hover:bg-destructive hover:text-white" onClick={() => setConfirmDelete(true)}>Delete</Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-destructive font-medium">This will permanently delete <span className="font-bold">{supporter.name}</span>.</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="destructive" onClick={() => deleteMember(supporter.id, { onSuccess: () => { toast({ title: `${supporter.name} removed` }); setConfirmDelete(false); onClose(); }, onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }) })} disabled={deletingMember} className="flex-1">{deletingMember && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Yes, delete</Button>
                      <Button size="sm" variant="outline" onClick={() => setConfirmDelete(false)} disabled={deletingMember} className="flex-1 border-border/50">Cancel</Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
