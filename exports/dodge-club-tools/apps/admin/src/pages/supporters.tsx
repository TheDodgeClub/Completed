import { useState, useEffect } from "react";
import { useMembers, useUpdateMember, useDeleteMember, AdminMember } from "@/hooks/use-members";
import { formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Search, Loader2, Pencil, Check, Trash2, Heart, Copy } from "lucide-react";

function resolveAvatarUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("/objects/")) return `/api/storage${url}`;
  return url;
}

export default function Supporters() {
  const { data: members, isLoading } = useMembers();
  const [search, setSearch] = useState("");
  const [selectedSupporter, setSelectedSupporter] = useState<AdminMember | null>(null);

  const filteredSupporters = members?.filter(m =>
    m.accountType === "supporter" &&
    (m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.email.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Supporters</h1>
        <p className="text-muted-foreground mt-1">Manage supporters — community members who cheer the club on.</p>
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
                <TableHead className="text-muted-foreground py-4 px-6">Supporter</TableHead>
                <TableHead className="text-muted-foreground py-4">Status</TableHead>
                <TableHead className="text-muted-foreground py-4">Referral Code</TableHead>
                <TableHead className="text-muted-foreground py-4 text-right px-6">Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading supporters...
                  </TableCell>
                </TableRow>
              ) : filteredSupporters?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                    {search ? `No supporters found matching "${search}"` : "No supporters yet."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredSupporters?.map((supporter) => (
                  <TableRow
                    key={supporter.id}
                    className="group cursor-pointer hover:bg-white/[0.02] border-border/50 transition-colors"
                    onClick={() => setSelectedSupporter(supporter)}
                  >
                    <TableCell className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center overflow-hidden border border-border/50 group-hover:border-pink-500/50 transition-colors">
                            {supporter.avatarUrl ? (
                              <img src={resolveAvatarUrl(supporter.avatarUrl)} alt={supporter.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="font-bold text-sm">{supporter.name.charAt(0)}</span>
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="font-semibold text-foreground group-hover:text-pink-400 transition-colors">{supporter.name}</div>
                          <div className="text-xs text-muted-foreground">{supporter.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant="outline" className="bg-pink-500/10 text-pink-400 border-pink-500/20">
                          <Heart className="w-3 h-3 mr-1" /> Supporter
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      {supporter.referralCode ? (
                        <span className="font-mono text-sm tracking-widest text-foreground bg-secondary/60 px-2 py-0.5 rounded-md border border-border/50">
                          {supporter.referralCode}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="px-6 text-sm text-muted-foreground text-right">
                      {formatDateTime(supporter.memberSince).split(" at ")[0]}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <SupporterDetailSheet supporter={selectedSupporter} onClose={() => setSelectedSupporter(null)} />
    </div>
  );
}

function SupporterDetailSheet({ supporter, onClose }: { supporter: AdminMember | null; onClose: () => void }) {
  const { mutate: updateMember, isPending: updatingProfile } = useUpdateMember();
  const { mutate: deleteMember, isPending: deletingMember } = useDeleteMember();
  const { toast } = useToast();

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
    updateMember(
      { id: supporter.id, data: { name: editName, username: editUsername || undefined, bio: editBio || undefined, memberSince: editMemberSince || undefined } },
      {
        onSuccess: () => { toast({ title: "Profile updated" }); setProfileExpanded(false); },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  };

  const handleDeleteSupporter = () => {
    if (!supporter) return;
    deleteMember(supporter.id, {
      onSuccess: () => {
        toast({ title: `${supporter.name} has been removed` });
        setConfirmDelete(false);
        onClose();
      },
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
  };

  const handleCopyReferral = () => {
    if (supporter?.referralCode) {
      navigator.clipboard.writeText(supporter.referralCode);
      toast({ title: "Referral code copied" });
    }
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
                      {supporter.avatarUrl ? (
                        <img src={resolveAvatarUrl(supporter.avatarUrl)} alt={supporter.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="font-display font-bold text-2xl text-muted-foreground">{supporter.name.charAt(0)}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <SheetTitle className="font-display text-xl text-foreground">{supporter.name}</SheetTitle>
                      <Badge variant="outline" className="bg-pink-500/10 text-pink-400 border-pink-500/20 text-[10px]">
                        <Heart className="w-2.5 h-2.5 mr-1" /> Supporter
                      </Badge>
                    </div>
                    {supporter.username && <p className="text-xs text-primary/70 font-medium">@{supporter.username}</p>}
                    <SheetDescription className="text-muted-foreground text-xs truncate">{supporter.email}</SheetDescription>
                  </div>
                </div>

                {supporter.bio && (
                  <p className="text-xs text-muted-foreground bg-secondary/30 rounded-lg px-3 py-2 mb-3 border border-border/30">{supporter.bio}</p>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-secondary/50 rounded-xl p-3 border border-border/50 text-center">
                    <p className="text-[10px] text-muted-foreground font-medium mb-0.5">Joined</p>
                    <p className="text-sm font-semibold text-foreground">{formatDateTime(supporter.memberSince).split(" at ")[0]}</p>
                  </div>
                  <div className="bg-pink-500/5 rounded-xl p-3 border border-pink-500/20 text-center">
                    <p className="text-[10px] text-pink-400/80 font-medium mb-0.5">Role</p>
                    <p className="text-sm font-semibold text-pink-400">Supporter</p>
                  </div>
                </div>
              </SheetHeader>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">

              {/* ---- REFERRAL CODE ---- */}
              {supporter.referralCode && (
                <div className="space-y-3">
                  <h3 className="font-display font-bold text-lg text-foreground">Referral Code</h3>
                  <div className="bg-secondary/20 border border-border/50 p-4 rounded-2xl flex items-center justify-between gap-3">
                    <span className="font-mono text-xl font-bold tracking-[0.3em] text-foreground">{supporter.referralCode}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyReferral}
                      className="shrink-0 gap-1.5 text-xs"
                    >
                      <Copy className="w-3.5 h-3.5" /> Copy
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">This is the code this supporter shares to bring new members into the club.</p>
                </div>
              )}

              {/* ---- EDIT PROFILE ---- */}
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setProfileExpanded(!profileExpanded);
                    if (!profileExpanded) {
                      setEditName(supporter.name);
                      setEditUsername(supporter.username ?? "");
                      setEditBio(supporter.bio ?? "");
                      setEditMemberSince(supporter.memberSince ? supporter.memberSince.split("T")[0] : "");
                    }
                  }}
                  className="w-full flex items-center justify-between text-left"
                >
                  <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
                    <Pencil className="w-5 h-5 text-muted-foreground" /> Edit Profile
                  </h3>
                  <span className="text-xs text-muted-foreground">{profileExpanded ? "▲ Close" : "▼ Expand"}</span>
                </button>
                {profileExpanded && (
                  <form onSubmit={handleSaveProfile} className="bg-secondary/20 border border-border/50 p-4 rounded-2xl space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Display Name</Label>
                        <Input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Name" className="bg-background border-border rounded-xl text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Username</Label>
                        <Input value={editUsername} onChange={e => setEditUsername(e.target.value)} placeholder="@username" className="bg-background border-border rounded-xl text-sm" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Bio</Label>
                      <Textarea value={editBio} onChange={e => setEditBio(e.target.value)} placeholder="Supporter bio..." rows={2} className="bg-background border-border rounded-xl text-sm resize-none" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Member Since</Label>
                      <input
                        type="date"
                        value={editMemberSince}
                        onChange={e => setEditMemberSince(e.target.value)}
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                      <p className="text-[10px] text-muted-foreground">Leave blank to use account creation date</p>
                    </div>
                    <Button type="submit" disabled={updatingProfile} className="w-full rounded-xl bg-primary hover:bg-primary/90 text-white">
                      {updatingProfile ? "Saving..." : "Save Profile"}
                    </Button>
                  </form>
                )}
              </div>

              {/* ---- DANGER ZONE ---- */}
              <div className="border border-destructive/30 rounded-2xl p-4 bg-destructive/5">
                <h3 className="font-display font-bold text-sm text-destructive mb-2 flex items-center gap-2">
                  <Trash2 className="w-4 h-4" /> Danger Zone
                </h3>
                {!confirmDelete ? (
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">Permanently remove this supporter and all their data.</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-3 shrink-0 border-destructive/40 text-destructive hover:bg-destructive hover:text-white"
                      onClick={() => setConfirmDelete(true)}
                    >
                      Delete Supporter
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-destructive font-medium">
                      This will permanently delete <span className="font-bold">{supporter?.name}</span> and all their data. This cannot be undone.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={handleDeleteSupporter}
                        disabled={deletingMember}
                        className="flex-1"
                      >
                        {deletingMember ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Yes, delete
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setConfirmDelete(false)}
                        disabled={deletingMember}
                        className="flex-1 border-border/50"
                      >
                        Cancel
                      </Button>
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
