import { useState, useEffect } from "react";
import {
  useMembers, useMemberAttendance, useMemberAwards,
  useMarkAttendance, useDeleteAttendance, useGrantAward, useRevokeAward,
  useUpdateMember, useDeleteMember, useBanMember, useUnbanMember, useWarnMember,
  useUserReports, useResolveUserReport,
  useGrantElite, useRevokeElite,
  AdminMember, UserReportGroup,
} from "@/hooks/use-members";
import { useEvents } from "@/hooks/use-events";
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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Search, Trophy, CalendarCheck, Trash2, ShieldCheck, Loader2, CircleDot,
  Pencil, Check, Heart, Copy, Users, Flag, Ban, AlertTriangle, CheckCircle2, Mail,
} from "lucide-react";
import LeaderboardPage from "@/pages/leaderboard";

const LEVEL_NAMES = ["Beginner", "Developing", "Experienced", "Skilled", "Advanced", "Pro", "League", "Expert", "Master", "Icon"];

function resolveAvatarUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("/objects/")) return `/api/storage${url}`;
  return url;
}

function Avatar({ member }: { member: { name: string; avatarUrl?: string | null } }) {
  return (
    <div className="relative shrink-0">
      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center overflow-hidden border border-border/50">
        {member.avatarUrl ? (
          <img src={resolveAvatarUrl(member.avatarUrl)} alt={member.name} className="w-full h-full object-cover" />
        ) : (
          <span className="font-bold text-sm">{member.name.charAt(0)}</span>
        )}
      </div>
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

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Members</h1>
        <p className="text-muted-foreground mt-1">
          Manage all {isLoading ? "…" : (members?.length ?? 0)} members — players and supporters.
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
          <TabsTrigger value="leaderboard" className="gap-2">
            <Trophy className="w-4 h-4" />
            Leaderboard
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-2">
            <Flag className="w-4 h-4" />
            Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="players" className="mt-6">
          <PlayersTab members={members} isLoading={isLoading} toast={toast} />
        </TabsContent>
        <TabsContent value="supporters" className="mt-6">
          <SupportersTab members={members} isLoading={isLoading} toast={toast} />
        </TabsContent>
        <TabsContent value="leaderboard" className="mt-6">
          <LeaderboardPage />
        </TabsContent>
        <TabsContent value="reports" className="mt-6">
          <UserReportsTab toast={toast} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ─── Players Tab ─── */
function PlayersTab({ members, isLoading, toast }: { members: AdminMember[] | undefined; isLoading: boolean; toast: any }) {
  const [search, setSearch] = useState("");
  const [eliteOnly, setEliteOnly] = useState(false);
  const [selected, setSelected] = useState<AdminMember | null>(null);

  const filtered = members?.filter(m =>
    (m.accountType === "player" || !m.accountType) &&
    (!eliteOnly || m.isElite) &&
    (m.name.toLowerCase().includes(search.toLowerCase()) || m.email.toLowerCase().includes(search.toLowerCase()))
  ) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <SearchBar value={search} onChange={setSearch} />
        </div>
        <button
          onClick={() => setEliteOnly(e => !e)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all whitespace-nowrap ${
            eliteOnly
              ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-400"
              : "bg-secondary/60 border-border/50 text-muted-foreground hover:text-foreground"
          }`}
        >
          <span>⭐</span>
          Elite only
          {eliteOnly && <span className="ml-1 text-xs bg-yellow-500/20 text-yellow-400 rounded-full px-1.5 py-0.5">{filtered.length}</span>}
        </button>
      </div>
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
                      {m.isElite && (
                        <Badge variant="outline" className="bg-yellow-500/10 text-yellow-400 border-yellow-500/30">⭐ Elite</Badge>
                      )}
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

/* ─── Player Detail Sheet ─── */
function PlayerCardPreview({ member }: { member: AdminMember }) {
  const skillList = member.skills
    ? member.skills.split(",").filter(Boolean).map(s => s.trim()).slice(0, 3)
    : [];
  const levelName = LEVEL_NAMES[(member.level ?? 1) - 1] ?? "Player";
  const avatarSrc = member.avatarUrl
    ? (member.avatarUrl.startsWith("/objects/") ? `/api/storage${member.avatarUrl}` : member.avatarUrl)
    : null;

  return (
    <div className="space-y-2">
      <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
        <span className="text-lg">🃏</span> Player Card
      </h3>
      <div className="flex justify-center">
        <div
          style={{
            width: 240,
            height: 396,
            borderRadius: 14,
            background: "linear-gradient(160deg, #071E0F 0%, #031008 55%, #000000 100%)",
            border: "2px solid rgba(57,255,20,0.25)",
            boxShadow: "0 0 28px rgba(57,255,20,0.35), inset 0 0 0 1.5px rgba(255,215,0,0.15)",
            position: "relative",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "12px 14px 10px",
            fontFamily: "inherit",
          }}
        >
          {/* Corner brackets */}
          {[
            { top: 7, left: 7 }, { top: 7, right: 7 },
            { bottom: 7, left: 7 }, { bottom: 7, right: 7 },
          ].map((pos, i) => (
            <span key={i} style={{
              position: "absolute", ...pos,
              width: 14, height: 14,
              borderTop: i < 2 ? "2px solid #39FF14" : "none",
              borderBottom: i >= 2 ? "2px solid #39FF14" : "none",
              borderLeft: (i === 0 || i === 2) ? "2px solid #39FF14" : "none",
              borderRight: (i === 1 || i === 3) ? "2px solid #39FF14" : "none",
              borderRadius: i === 0 ? "4px 0 0 0" : i === 1 ? "0 4px 0 0" : i === 2 ? "0 0 0 4px" : "0 0 4px 0",
            }} />
          ))}

          {/* Top row: logo | spacer | LV pill */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", marginBottom: 8 }}>
            <img
              src={`${import.meta.env.BASE_URL}tdc-logo.png`}
              alt="TDC"
              style={{ width: 30, height: 30, objectFit: "contain", filter: "brightness(0) invert(1)" }}
              onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
            <div style={{
              background: "#FFD700",
              borderRadius: 7,
              padding: "3px 8px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              lineHeight: 1,
            }}>
              <span style={{ fontWeight: 800, fontSize: 15, color: "#000", lineHeight: 1 }}>{member.level ?? 1}</span>
              <span style={{ fontWeight: 700, fontSize: 7, color: "#000", letterSpacing: 1 }}>LV</span>
            </div>
          </div>

          {/* Avatar with glow */}
          <div style={{ position: "relative", width: 130, height: 130, marginBottom: 0 }}>
            <div style={{
              position: "absolute", inset: -10,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(57,255,20,0.22) 0%, transparent 70%)",
            }} />
            <div style={{
              width: 130, height: 130, borderRadius: "50%",
              border: "2.5px solid #FFD700",
              overflow: "hidden",
              background: "#0B2E17",
              boxShadow: "0 0 12px rgba(255,215,0,0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              {avatarSrc ? (
                <img src={avatarSrc} alt={member.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ fontWeight: 800, fontSize: 48, color: "#FFD700", lineHeight: 1 }}>
                  {member.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
          </div>

          {/* Name banner */}
          <div style={{
            width: "100%",
            background: "rgba(0,0,0,0.70)",
            borderTop: "1px solid rgba(255,215,0,0.25)",
            borderBottom: "1px solid rgba(255,215,0,0.25)",
            padding: "5px 8px",
            marginTop: 8,
            textAlign: "center",
          }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: "#fff", letterSpacing: 1.2, lineHeight: 1.2 }}>
              {member.name.toUpperCase()}
            </div>
            {member.username && (
              <div style={{ fontWeight: 400, fontSize: 10, color: "rgba(255,255,255,0.45)", marginTop: 1 }}>
                @{member.username}
              </div>
            )}
          </div>

          {/* Tier + XP row */}
          <div style={{ display: "flex", gap: 6, marginTop: 6, alignItems: "center" }}>
            <span style={{
              background: "rgba(57,255,20,0.10)",
              border: "1px solid rgba(57,255,20,0.22)",
              borderRadius: 5,
              padding: "2px 8px",
              fontSize: 8,
              fontWeight: 700,
              color: "#39FF14",
              letterSpacing: 1.4,
            }}>{levelName.toUpperCase()}</span>
            <span style={{
              background: "rgba(255,215,0,0.10)",
              border: "1px solid rgba(255,215,0,0.25)",
              borderRadius: 5,
              padding: "2px 8px",
              fontSize: 8,
              fontWeight: 700,
              color: "#FFD700",
              letterSpacing: 1.1,
            }}>{(member.xp ?? 0).toLocaleString()} XP</span>
          </div>

          {/* Stats band */}
          <div style={{
            display: "flex",
            width: "100%",
            background: "rgba(255,215,0,0.05)",
            border: "1px solid rgba(255,215,0,0.22)",
            borderRadius: 9,
            marginTop: 8,
            padding: "7px 0",
          }}>
            {[
              { val: member.medalsEarned, label: "MEDALS" },
              { val: member.ringsEarned ?? 0, label: "RINGS" },
            ].map((s, i) => (
              <div key={s.label} style={{
                flex: 1,
                textAlign: "center",
                borderLeft: i > 0 ? "1px solid rgba(255,215,0,0.2)" : "none",
              }}>
                <div style={{ fontWeight: 800, fontSize: 20, color: "#fff", lineHeight: 1 }}>{s.val}</div>
                <div style={{ fontWeight: 700, fontSize: 7, color: "#FFD700", letterSpacing: 1.4, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Skills */}
          {skillList.length > 0 && (
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", justifyContent: "center", marginTop: 8 }}>
              {skillList.map(skill => (
                <span key={skill} style={{
                  border: "1px solid rgba(255,255,255,0.18)",
                  borderRadius: 8,
                  padding: "2px 8px",
                  fontSize: 9,
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.75)",
                  background: "rgba(255,255,255,0.04)",
                }}>{skill}</span>
              ))}
            </div>
          )}

          {/* Footer */}
          <div style={{
            position: "absolute", bottom: 8,
            fontSize: 8, color: "rgba(57,255,20,0.4)",
            letterSpacing: 1.2, fontWeight: 400,
          }}>thedodgeclub.co.uk</div>
        </div>
      </div>
    </div>
  );
}

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
  const { mutate: banMember, isPending: banning } = useBanMember();
  const { mutate: unbanMember, isPending: unbanning } = useUnbanMember();
  const { mutate: warnMember, isPending: warning } = useWarnMember();
  const { mutate: grantElite, isPending: grantingElite } = useGrantElite();
  const { mutate: revokeElite, isPending: revokingElite } = useRevokeElite();
  const [warnReason, setWarnReason] = useState("");

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
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <SheetTitle className="font-display text-xl text-foreground">{member.name}</SheetTitle>
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-accent/20 text-accent border border-accent/30 rounded">LV {member.level ?? 1}</span>
                      <span className="text-xs text-muted-foreground">{levelName}</span>
                      {member.isElite && (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 rounded">⭐ ELITE</span>
                      )}
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
              {/* Player Card Preview */}
              <PlayerCardPreview member={member} />

              {/* Elite Membership */}
              <div className={`flex items-center justify-between px-4 py-3 rounded-xl border ${member.isElite ? "bg-yellow-500/8 border-yellow-500/30" : "bg-secondary/30 border-border/40"}`}>
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-foreground">Elite Membership</p>
                  <p className="text-xs text-muted-foreground">
                    {member.isElite
                      ? `⭐ Elite since ${member.eliteSince ? new Date(member.eliteSince).toLocaleDateString("en-GB", { month: "long", year: "numeric" }) : "unknown"}`
                      : "Not an Elite member"}
                  </p>
                </div>
                {member.isElite ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/10 gap-1.5 text-xs"
                    disabled={revokingElite}
                    onClick={() => {
                      if (!window.confirm(`Remove Elite status from ${member.name}? This will not cancel any Stripe subscription.`)) return;
                      revokeElite(member.id, {
                        onSuccess: () => toast({ title: `Elite removed from ${member.name}` }),
                        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
                      });
                    }}
                  >
                    {revokingElite ? <Loader2 className="w-3 h-3 animate-spin" /> : "⭐"}
                    Remove Elite
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black font-bold gap-1.5 text-xs"
                    disabled={grantingElite}
                    onClick={() => {
                      if (!window.confirm(`Grant Elite to ${member.name}? They'll receive +500 XP and a welcome email.`)) return;
                      grantElite(member.id, {
                        onSuccess: () => toast({ title: `⭐ Elite granted to ${member.name}` }),
                        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
                      });
                    }}
                  >
                    {grantingElite ? <Loader2 className="w-3 h-3 animate-spin" /> : "⭐"}
                    Grant Elite
                  </Button>
                )}
              </div>

              {/* Account Type Toggle */}
              <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-secondary/30 border border-border/40">
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-foreground">Account Type</p>
                  <p className="text-xs text-muted-foreground">
                    {member.accountType === "supporter" ? "♥ Supporter — does not play but follows the club" : "Player — active dodgeball participant"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${member.accountType !== "supporter" ? "text-primary" : "text-muted-foreground"}`}>Player</span>
                  <Switch
                    checked={member.accountType === "supporter"}
                    onCheckedChange={(checked) => {
                      updateMember({ id: member.id, data: { accountType: checked ? "supporter" : "player" } }, {
                        onSuccess: () => toast({ title: `Converted to ${checked ? "Supporter" : "Player"}` }),
                        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
                      });
                    }}
                    className="data-[state=checked]:bg-pink-500"
                  />
                  <span className={`text-xs font-medium ${member.accountType === "supporter" ? "text-pink-500" : "text-muted-foreground"}`}>Supporter</span>
                </div>
              </div>

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
                          <p className="text-sm font-medium text-foreground">{rec.event?.title ?? "Event"}</p>
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

              {/* Moderation */}
              <div className="space-y-4">
                <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-yellow-500" />Moderation</h3>

                {/* Warn */}
                <div className="bg-secondary/20 border border-border/50 p-4 rounded-2xl space-y-3">
                  <p className="text-sm font-semibold text-foreground flex items-center gap-2"><Mail className="w-4 h-4 text-muted-foreground" />Send Warning Email</p>
                  <Input
                    placeholder="Optional reason or message to include…"
                    value={warnReason}
                    onChange={e => setWarnReason(e.target.value)}
                    className="bg-background border-border rounded-xl text-sm"
                  />
                  <Button
                    size="sm"
                    className="w-full rounded-xl bg-yellow-600 hover:bg-yellow-700 text-white gap-2"
                    disabled={warning}
                    onClick={() => {
                      if (!window.confirm(`Send a warning email to ${member.name}?`)) return;
                      warnMember({ id: member.id, reason: warnReason || undefined }, {
                        onSuccess: () => { toast({ title: "Warning email sent" }); setWarnReason(""); },
                        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
                      });
                    }}
                  >
                    {warning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                    Send Warning
                  </Button>
                </div>

                {/* Ban / Unban */}
                <div className={`p-4 rounded-2xl border space-y-3 ${member.isBanned ? "bg-green-500/5 border-green-500/30" : "bg-orange-500/5 border-orange-500/30"}`}>
                  {member.isBanned ? (
                    <>
                      <div className="flex items-center gap-2">
                        <Ban className="w-4 h-4 text-green-500" />
                        <p className="text-sm font-semibold text-green-500">Account is suspended</p>
                      </div>
                      <p className="text-xs text-muted-foreground">This member cannot log in. Lift the suspension to restore access.</p>
                      <Button
                        size="sm" className="w-full rounded-xl bg-green-700 hover:bg-green-800 text-white gap-2"
                        disabled={unbanning}
                        onClick={() => {
                          if (!window.confirm(`Lift suspension for ${member.name}? They will be able to log in again.`)) return;
                          unbanMember(member.id, {
                            onSuccess: () => toast({ title: `${member.name} unsuspended` }),
                            onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
                          });
                        }}
                      >
                        {unbanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        Lift Suspension
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <Ban className="w-4 h-4 text-orange-500" />
                        <p className="text-sm font-semibold text-orange-500">Suspend Account</p>
                      </div>
                      <p className="text-xs text-muted-foreground">This will prevent the member from logging in. They can be reinstated at any time.</p>
                      <Button
                        size="sm" variant="outline"
                        className="w-full rounded-xl border-orange-500/40 text-orange-500 hover:bg-orange-500 hover:text-white gap-2"
                        disabled={banning}
                        onClick={() => {
                          if (!window.confirm(`Suspend ${member.name}? They will be unable to log in until the suspension is lifted.`)) return;
                          banMember(member.id, {
                            onSuccess: () => toast({ title: `${member.name} suspended` }),
                            onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
                          });
                        }}
                      >
                        {banning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                        Suspend Account
                      </Button>
                    </>
                  )}
                </div>
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

/* ─── User Reports Tab ─── */
function UserReportsTab({ toast }: { toast: any }) {
  const { data: groups, isLoading } = useUserReports();
  const { mutate: banMember, isPending: banning } = useBanMember();
  const { mutate: unbanMember, isPending: unbanning } = useUnbanMember();
  const { mutate: warnMember, isPending: warning } = useWarnMember();
  const { mutate: resolveReport, isPending: resolving } = useResolveUserReport();
  const [expandedId, setExpandedId] = useState<number | null>(null);

  if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  if (!groups || groups.length === 0) return (
    <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
      <Flag className="w-10 h-10 text-muted-foreground/40" />
      <p className="text-muted-foreground text-sm">No user reports yet.</p>
    </div>
  );

  return (
    <div className="space-y-4">
      {groups.map((group: UserReportGroup) => {
        const expanded = expandedId === group.userId;
        return (
          <div key={group.userId} className="border border-border/50 rounded-2xl overflow-hidden bg-card">
            {/* Header row */}
            <button
              className="w-full flex items-center gap-4 p-4 hover:bg-secondary/20 transition-colors text-left"
              onClick={() => setExpandedId(expanded ? null : group.userId)}
            >
              <div className="w-10 h-10 rounded-full bg-secondary border border-border flex items-center justify-center text-sm font-bold text-muted-foreground shrink-0">
                {group.avatarUrl ? (
                  <img src={group.avatarUrl} alt={group.name} className="w-full h-full object-cover rounded-full" />
                ) : group.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-foreground">{group.name}</span>
                  {group.isBanned && <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px]"><Ban className="w-2.5 h-2.5 mr-1" />Suspended</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">{group.email}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {group.unresolvedCount > 0 && (
                  <Badge className="bg-red-500/15 text-red-400 border-red-500/25">{group.unresolvedCount} new</Badge>
                )}
                <span className="text-xs text-muted-foreground">{group.reportCount} total</span>
                <span className="text-muted-foreground text-xs">{expanded ? "▲" : "▼"}</span>
              </div>
            </button>

            {/* Expanded detail */}
            {expanded && (
              <div className="border-t border-border/50 p-4 space-y-4">
                {/* Action buttons */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm" variant="outline"
                    className="gap-1.5 text-xs border-yellow-500/40 text-yellow-500 hover:bg-yellow-500 hover:text-white"
                    disabled={warning}
                    onClick={() => {
                      if (!window.confirm(`Send a warning email to ${group.name}?`)) return;
                      warnMember({ id: group.userId }, {
                        onSuccess: () => toast({ title: "Warning email sent" }),
                        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
                      });
                    }}
                  >
                    {warning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                    Send Warning
                  </Button>

                  {group.isBanned ? (
                    <Button
                      size="sm" variant="outline"
                      className="gap-1.5 text-xs border-green-500/40 text-green-500 hover:bg-green-500 hover:text-white"
                      disabled={unbanning}
                      onClick={() => {
                        if (!window.confirm(`Lift suspension for ${group.name}? They will be able to log in again.`)) return;
                        unbanMember(group.userId, {
                          onSuccess: () => toast({ title: `${group.name} unsuspended` }),
                          onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
                        });
                      }}
                    >
                      {unbanning ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      Lift Suspension
                    </Button>
                  ) : (
                    <Button
                      size="sm" variant="outline"
                      className="gap-1.5 text-xs border-red-500/40 text-red-500 hover:bg-red-500 hover:text-white"
                      disabled={banning}
                      onClick={() => {
                        if (!window.confirm(`Suspend ${group.name}? They will be unable to log in until the suspension is lifted.`)) return;
                        banMember(group.userId, {
                          onSuccess: () => toast({ title: `${group.name} suspended` }),
                          onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
                        });
                      }}
                    >
                      {banning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
                      Suspend
                    </Button>
                  )}
                </div>

                {/* Individual reports */}
                <div className="space-y-2">
                  {group.reports.map(report => (
                    <div key={report.id} className={`flex items-start gap-3 p-3 rounded-xl border text-sm ${report.resolved ? "bg-secondary/10 border-border/30 opacity-60" : "bg-background border-border/50"}`}>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground">{report.reason || "No reason given"}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Reported by <span className="font-medium">{report.reportedBy}</span> · {new Date(report.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </div>
                      {report.resolved ? (
                        <span className="text-[10px] text-green-500 font-semibold flex items-center gap-1 shrink-0"><Check className="w-3 h-3" />Resolved</span>
                      ) : (
                        <Button
                          size="sm" variant="ghost"
                          className="h-7 text-xs gap-1 text-muted-foreground hover:text-green-500 hover:bg-green-500/10 shrink-0"
                          disabled={resolving}
                          onClick={() => resolveReport(report.id, {
                            onSuccess: () => toast({ title: "Report resolved" }),
                            onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
                          })}
                        >
                          {resolving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                          Resolve
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
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
