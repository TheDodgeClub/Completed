import { useState } from "react";
import { useMembers, useMemberAttendance, useMemberAwards, useMarkAttendance, useDeleteAttendance, useGrantAward, useRevokeAward, AdminMember } from "@/hooks/use-members";
import { useEvents } from "@/hooks/use-events";
import { formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Search, Trophy, CalendarCheck, Trash2, ShieldCheck, Loader2, CircleDot } from "lucide-react";

export default function Members() {
  const { data: members, isLoading } = useMembers();
  const [search, setSearch] = useState("");
  const [selectedMember, setSelectedMember] = useState<AdminMember | null>(null);

  const filteredMembers = members?.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Club Members</h1>
        <p className="text-muted-foreground mt-1">Manage members, view attendance, and award medals & rings.</p>
      </div>

      <div className="flex items-center space-x-2 bg-card border border-border/50 rounded-xl px-4 py-2 shadow-lg shadow-black/5 w-full max-w-md">
        <Search className="w-5 h-5 text-muted-foreground" />
        <Input
          className="border-0 bg-transparent focus-visible:ring-0 px-2 h-10 shadow-none text-foreground"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
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
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading members...
                  </TableCell>
                </TableRow>
              ) : filteredMembers?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    No members found matching &quot;{search}&quot;
                  </TableCell>
                </TableRow>
              ) : (
                filteredMembers?.map((member) => (
                  <TableRow
                    key={member.id}
                    className="group cursor-pointer hover:bg-white/[0.02] border-border/50 transition-colors"
                    onClick={() => setSelectedMember(member)}
                  >
                    <TableCell className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center overflow-hidden border border-border/50 group-hover:border-primary/50 transition-colors">
                          {member.avatarUrl ? (
                            <img src={member.avatarUrl} alt={member.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="font-bold text-sm">{member.name.charAt(0)}</span>
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground group-hover:text-primary transition-colors">{member.name}</div>
                          <div className="text-xs text-muted-foreground">{member.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {member.isAdmin ? (
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20"><ShieldCheck className="w-3 h-3 mr-1" /> Admin</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-secondary/50 text-muted-foreground border-border/50">Member</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="inline-flex items-center justify-center min-w-[2.5rem] px-2 py-1 rounded-md bg-secondary text-foreground font-semibold">
                        {member.eventsAttended}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="inline-flex items-center gap-1.5 min-w-[3rem] justify-center px-2 py-1 rounded-md bg-accent/10 text-accent font-semibold border border-accent/20">
                        <Trophy className="w-3.5 h-3.5" /> {member.medalsEarned}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="inline-flex items-center gap-1.5 min-w-[3rem] justify-center px-2 py-1 rounded-md bg-violet-500/10 text-violet-400 font-semibold border border-violet-500/20">
                        <CircleDot className="w-3.5 h-3.5" /> {member.ringsEarned ?? 0}
                      </div>
                    </TableCell>
                    <TableCell className="text-right px-6 text-sm text-muted-foreground">
                      {formatDateTime(member.memberSince).split(" at ")[0]}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <MemberDetailSheet member={selectedMember} onClose={() => setSelectedMember(null)} />
    </div>
  );
}

function MemberDetailSheet({ member, onClose }: { member: AdminMember | null; onClose: () => void }) {
  const { data: attendance, isLoading: loadingAttendance } = useMemberAttendance(member?.id ?? null);
  const { data: awards, isLoading: loadingAwards } = useMemberAwards(member?.id ?? null);
  const { data: events } = useEvents();
  const { mutate: markAttendance, isPending: marking } = useMarkAttendance();
  const { mutate: deleteAttendance, isPending: deleting } = useDeleteAttendance();
  const { mutate: grantAward, isPending: granting } = useGrantAward();
  const { mutate: revokeAward, isPending: revoking } = useRevokeAward();
  const { toast } = useToast();

  const [selectedEvent, setSelectedEvent] = useState("");
  const [earnedMedal, setEarnedMedal] = useState(false);
  const [awardNote, setAwardNote] = useState("");

  const handleAddAttendance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!member || !selectedEvent) return;
    markAttendance({ userId: member.id, eventId: Number(selectedEvent), earnedMedal }, {
      onSuccess: () => {
        toast({ title: "Attendance recorded" });
        setSelectedEvent("");
        setEarnedMedal(false);
      },
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
  };

  const handleRemoveAttendance = (recordId: number) => {
    deleteAttendance(recordId, {
      onSuccess: () => toast({ title: "Record removed" }),
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
  };

  const handleGrant = (type: "medal" | "ring") => {
    if (!member) return;
    grantAward({ userId: member.id, type, note: awardNote || undefined }, {
      onSuccess: () => {
        toast({ title: `${type === "medal" ? "Medal" : "Ring"} awarded to ${member.name}` });
        setAwardNote("");
      },
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
  };

  const handleRevoke = (awardId: number) => {
    if (!member) return;
    revokeAward({ id: awardId, userId: member.id }, {
      onSuccess: () => toast({ title: "Award revoked" }),
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
  };

  return (
    <Sheet open={!!member} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-md border-l border-border bg-card/95 backdrop-blur-xl p-0 flex flex-col">
        {member && (
          <>
            <div className="p-6 border-b border-border/50 bg-background/50">
              <SheetHeader className="text-left space-y-0">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center overflow-hidden border-2 border-border">
                    {member.avatarUrl ? (
                      <img src={member.avatarUrl} alt={member.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-display font-bold text-2xl text-muted-foreground">{member.name.charAt(0)}</span>
                    )}
                  </div>
                  <div>
                    <SheetTitle className="font-display text-2xl text-foreground">{member.name}</SheetTitle>
                    <SheetDescription className="text-muted-foreground">{member.email}</SheetDescription>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <div className="flex-1 bg-secondary/50 rounded-xl p-3 border border-border/50 text-center">
                    <p className="text-xs text-muted-foreground font-medium mb-1">Events</p>
                    <p className="text-xl font-display font-bold text-foreground">{member.eventsAttended}</p>
                  </div>
                  <div className="flex-1 bg-accent/5 rounded-xl p-3 border border-accent/20 text-center">
                    <p className="text-xs text-accent/80 font-medium mb-1">Medals</p>
                    <p className="text-xl font-display font-bold text-accent flex items-center justify-center gap-1">
                      <Trophy className="w-4 h-4" /> {member.medalsEarned}
                    </p>
                  </div>
                  <div className="flex-1 bg-violet-500/5 rounded-xl p-3 border border-violet-500/20 text-center">
                    <p className="text-xs text-violet-400/80 font-medium mb-1">Rings</p>
                    <p className="text-xl font-display font-bold text-violet-400 flex items-center justify-center gap-1">
                      <CircleDot className="w-4 h-4" /> {member.ringsEarned ?? 0}
                    </p>
                  </div>
                </div>
              </SheetHeader>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">

              {/* ---- AWARD MEDALS & RINGS ---- */}
              <div className="space-y-4">
                <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-accent" /> Award Medals & Rings
                </h3>
                <div className="bg-secondary/20 border border-border/50 p-4 rounded-2xl space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Optional note (reason / event / milestone)</Label>
                    <Input
                      placeholder="e.g. Championship win, Season MVP…"
                      value={awardNote}
                      onChange={(e) => setAwardNote(e.target.value)}
                      className="bg-background border-border rounded-xl text-sm"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 rounded-xl bg-accent text-accent-foreground hover:bg-accent/90 shadow-md shadow-accent/20 font-bold gap-2"
                      onClick={() => handleGrant("medal")}
                      disabled={granting}
                    >
                      <Trophy className="w-4 h-4" /> Award Medal
                    </Button>
                    <Button
                      className="flex-1 rounded-xl bg-violet-600 text-white hover:bg-violet-700 shadow-md shadow-violet-500/20 font-bold gap-2"
                      onClick={() => handleGrant("ring")}
                      disabled={granting}
                    >
                      <CircleDot className="w-4 h-4" /> Award Ring
                    </Button>
                  </div>
                </div>

                {/* List of existing direct awards */}
                {loadingAwards ? (
                  <div className="text-center py-4 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin mx-auto" /></div>
                ) : awards && awards.length > 0 ? (
                  <div className="space-y-2">
                    {awards.map((award) => (
                      <div key={award.id} className="flex items-center justify-between px-4 py-3 bg-background border border-border/50 rounded-xl group hover:border-primary/30 transition-colors">
                        <div className="flex items-center gap-2.5">
                          {award.type === "medal" ? (
                            <span className="flex items-center text-accent bg-accent/10 px-2 py-0.5 rounded-md text-xs font-bold border border-accent/20 gap-1">
                              <Trophy className="w-3 h-3" /> Medal
                            </span>
                          ) : (
                            <span className="flex items-center text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-md text-xs font-bold border border-violet-500/20 gap-1">
                              <CircleDot className="w-3 h-3" /> Ring
                            </span>
                          )}
                          <div>
                            {award.note && <div className="text-xs font-medium text-foreground">{award.note}</div>}
                            <div className="text-[10px] text-muted-foreground">{formatDateTime(award.awardedAt).split(" at ")[0]}</div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                          onClick={() => handleRevoke(award.id)}
                          disabled={revoking}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              {/* ---- RECORD ATTENDANCE ---- */}
              <div className="space-y-4">
                <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
                  <CalendarCheck className="w-5 h-5 text-primary" /> Record Attendance
                </h3>
                <form onSubmit={handleAddAttendance} className="bg-secondary/20 border border-border/50 p-4 rounded-2xl space-y-4">
                  <div className="space-y-2">
                    <Label>Select Event</Label>
                    <select
                      value={selectedEvent}
                      onChange={(e) => setSelectedEvent(e.target.value)}
                      required
                      className="flex h-10 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 text-foreground"
                    >
                      <option value="" disabled>-- Choose an event --</option>
                      {events?.map(e => (
                        <option key={e.id} value={e.id}>{e.title} ({e.date.split("T")[0]}) {e.isUpcoming ? "— Upcoming" : ""}</option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground">All events are listed. Select any event to record attendance.</p>
                  </div>

                  <div className="flex items-center space-x-2 pt-2">
                    <Checkbox
                      id="medal"
                      checked={earnedMedal}
                      onCheckedChange={(c) => setEarnedMedal(c === true)}
                      className="data-[state=checked]:bg-accent data-[state=checked]:border-accent text-accent-foreground"
                    />
                    <Label htmlFor="medal" className="cursor-pointer font-medium flex items-center gap-1.5">
                      Earned Medal <Trophy className="w-3.5 h-3.5 text-accent" />
                    </Label>
                  </div>

                  <Button type="submit" disabled={marking || !selectedEvent} className="w-full rounded-xl bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/20">
                    {marking ? "Recording..." : "Add Record"}
                  </Button>
                </form>
              </div>

              {/* ---- ATTENDANCE HISTORY ---- */}
              <div className="space-y-4">
                <h3 className="font-display font-bold text-lg text-foreground">Attendance History</h3>
                {loadingAttendance ? (
                  <div className="text-center p-8 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
                ) : attendance?.length === 0 ? (
                  <div className="text-center p-6 bg-secondary/30 rounded-2xl border border-dashed border-border/50 text-muted-foreground text-sm">
                    No attendance records yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {attendance?.map((record) => (
                      <div key={record.id} className="flex items-center justify-between p-4 bg-background border border-border/50 rounded-xl group hover:border-primary/30 transition-colors">
                        <div>
                          <div className="font-medium text-foreground text-sm">{record.event.title}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                            <span>{formatDateTime(record.attendedAt).split(" at ")[0]}</span>
                            {record.earnedMedal && (
                              <span className="flex items-center text-accent bg-accent/10 px-1.5 py-0.5 rounded text-[10px] font-bold border border-accent/20">
                                <Trophy className="w-3 h-3 mr-1" /> Medal
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                          onClick={() => handleRemoveAttendance(record.id)}
                          disabled={deleting}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
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
