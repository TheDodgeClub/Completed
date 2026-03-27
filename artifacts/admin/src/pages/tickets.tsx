import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Search, Ticket, XCircle, UserCheck, Send, Loader2, Gift, CheckCircle2 } from "lucide-react";
import { formatDateTime } from "@/lib/format";

interface AdminTicket {
  id: number;
  ticketCode: string;
  status: string;
  amountPaid: number;
  checkedIn: boolean;
  checkedInAt: string | null;
  giftRecipientEmail: string | null;
  createdAt: string;
  userId: number;
  userName: string | null;
  userEmail: string;
  eventId: number;
  eventTitle: string;
  eventDate: string;
  eventLocation: string | null;
}

function useAdminTickets() {
  return useQuery<AdminTicket[]>({
    queryKey: ["admin-tickets"],
    queryFn: () => fetchApi("/api/admin/tickets"),
  });
}

function formatAmount(cents: number) {
  if (!cents) return "Free";
  return `£${(cents / 100).toFixed(2)}`;
}

export default function TicketsPage() {
  const { data: tickets, isLoading } = useAdminTickets();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [eventFilter, setEventFilter] = useState("all");

  // Cancel dialog
  const [cancelTarget, setCancelTarget] = useState<AdminTicket | null>(null);

  // Reallocate sheet
  const [reallocateTarget, setReallocateTarget] = useState<AdminTicket | null>(null);
  const [reallocateEmail, setReallocateEmail] = useState("");

  // Resend loading state per ticket
  const [resending, setResending] = useState<number | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [reallocating, setReallocating] = useState(false);

  // Unique events for filter dropdown
  const events = useMemo(() => {
    if (!tickets) return [];
    const seen = new Set<number>();
    return tickets
      .filter(t => { if (seen.has(t.eventId)) return false; seen.add(t.eventId); return true; })
      .map(t => ({ id: t.eventId, title: t.eventTitle }))
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [tickets]);

  const filtered = useMemo(() => {
    if (!tickets) return [];
    const q = search.toLowerCase();
    return tickets.filter(t => {
      if (eventFilter !== "all" && t.eventId !== Number(eventFilter)) return false;
      if (!q) return true;
      return (
        (t.userName ?? "").toLowerCase().includes(q) ||
        t.userEmail.toLowerCase().includes(q) ||
        t.ticketCode.toLowerCase().includes(q) ||
        t.eventTitle.toLowerCase().includes(q) ||
        (t.giftRecipientEmail ?? "").toLowerCase().includes(q)
      );
    });
  }, [tickets, search, eventFilter]);

  async function handleCancel() {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await fetchApi(`/api/admin/tickets/${cancelTarget.id}`, { method: "DELETE" });
      queryClient.invalidateQueries({ queryKey: ["admin-tickets"] });
      toast({ title: "Ticket cancelled", description: `${cancelTarget.ticketCode} has been cancelled.` });
      setCancelTarget(null);
    } catch (err: any) {
      toast({ title: "Failed to cancel", description: err.message, variant: "destructive" });
    } finally {
      setCancelling(false);
    }
  }

  async function handleReallocate() {
    if (!reallocateTarget || !reallocateEmail.trim()) return;
    setReallocating(true);
    try {
      const result = await fetchApi<{ newOwner: { name: string | null; email: string } }>(
        `/api/admin/tickets/${reallocateTarget.id}/reallocate`,
        { method: "PUT", body: JSON.stringify({ email: reallocateEmail.trim() }) }
      );
      queryClient.invalidateQueries({ queryKey: ["admin-tickets"] });
      const name = result.newOwner.name ?? result.newOwner.email;
      toast({ title: "Ticket reallocated", description: `Ticket moved to ${name}.` });
      setReallocateTarget(null);
      setReallocateEmail("");
    } catch (err: any) {
      toast({ title: "Reallocation failed", description: err.message, variant: "destructive" });
    } finally {
      setReallocating(false);
    }
  }

  async function handleResend(ticket: AdminTicket) {
    setResending(ticket.id);
    try {
      const result = await fetchApi<{ sentTo: string }>(`/api/admin/tickets/${ticket.id}/resend`, { method: "POST" });
      toast({ title: "Email resent", description: `Confirmation sent to ${result.sentTo}.` });
    } catch (err: any) {
      toast({ title: "Resend failed", description: err.message, variant: "destructive" });
    } finally {
      setResending(null);
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Tickets</h1>
        <p className="text-muted-foreground mt-1">
          View all ticket purchases, cancel, reallocate or resend confirmations.
        </p>
      </div>

      {/* Search + filter row */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 bg-card border border-border/50 rounded-xl px-4 py-2 shadow-lg shadow-black/5 flex-1 min-w-[200px] max-w-md">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <Input
            className="border-0 bg-transparent focus-visible:ring-0 px-1 h-9 shadow-none text-foreground"
            placeholder="Search member, code, event…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={eventFilter}
          onChange={(e) => setEventFilter(e.target.value)}
          className="rounded-xl border border-border/50 bg-card text-foreground text-sm px-3 py-2 shadow-lg shadow-black/5 focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          <option value="all">All events</option>
          {events.map(e => (
            <option key={e.id} value={e.id}>{e.title}</option>
          ))}
        </select>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground self-center ml-1">
          <Ticket className="w-4 h-4" />
          {filtered.length} ticket{filtered.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-lg shadow-black/10">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-secondary/50 border-b border-border/50">
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-muted-foreground py-4 px-6">Member</TableHead>
                <TableHead className="text-muted-foreground py-4">Event</TableHead>
                <TableHead className="text-muted-foreground py-4">Ticket Code</TableHead>
                <TableHead className="text-muted-foreground py-4 text-center">Paid</TableHead>
                <TableHead className="text-muted-foreground py-4 text-center">Status</TableHead>
                <TableHead className="text-muted-foreground py-4">Purchased</TableHead>
                <TableHead className="text-muted-foreground py-4 text-right px-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading tickets…
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    {search || eventFilter !== "all" ? `No tickets match your search.` : "No tickets yet."}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((ticket) => (
                  <TableRow key={ticket.id} className="border-b border-border/30 hover:bg-secondary/20 transition-colors">
                    {/* Member */}
                    <TableCell className="py-4 px-6">
                      <div>
                        <p className="font-medium text-sm leading-tight">{ticket.userName ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">{ticket.userEmail}</p>
                        {ticket.giftRecipientEmail && (
                          <div className="flex items-center gap-1 mt-1">
                            <Gift className="w-3 h-3 text-primary" />
                            <span className="text-xs text-primary">{ticket.giftRecipientEmail}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* Event */}
                    <TableCell className="py-4">
                      <div>
                        <p className="text-sm font-medium leading-tight">{ticket.eventTitle}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(ticket.eventDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </div>
                    </TableCell>

                    {/* Ticket code */}
                    <TableCell className="py-4">
                      <code className="text-xs font-mono bg-secondary/50 px-2 py-1 rounded-md tracking-wider">
                        {ticket.ticketCode}
                      </code>
                    </TableCell>

                    {/* Amount */}
                    <TableCell className="py-4 text-center text-sm">
                      {formatAmount(ticket.amountPaid)}
                    </TableCell>

                    {/* Status */}
                    <TableCell className="py-4 text-center">
                      {ticket.checkedIn ? (
                        <Badge className="bg-green-500/15 text-green-500 border-green-500/20 gap-1 text-xs">
                          <CheckCircle2 className="w-3 h-3" /> Checked In
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-muted-foreground">Not yet</Badge>
                      )}
                    </TableCell>

                    {/* Purchased */}
                    <TableCell className="py-4 text-sm text-muted-foreground whitespace-nowrap">
                      {formatDateTime(ticket.createdAt)}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="py-4 px-6">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs gap-1.5"
                          onClick={() => handleResend(ticket)}
                          disabled={resending === ticket.id}
                          title="Resend confirmation email"
                        >
                          {resending === ticket.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Send className="w-3.5 h-3.5" />}
                          Resend
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs gap-1.5"
                          onClick={() => { setReallocateTarget(ticket); setReallocateEmail(""); }}
                          title="Reallocate to another member"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          Reallocate
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setCancelTarget(ticket)}
                          title="Cancel ticket"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Cancel
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Cancel confirm dialog */}
      <AlertDialog open={!!cancelTarget} onOpenChange={(o) => !o && setCancelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this ticket?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel ticket <strong>{cancelTarget?.ticketCode}</strong> for{" "}
              <strong>{cancelTarget?.userName ?? cancelTarget?.userEmail}</strong> at{" "}
              <strong>{cancelTarget?.eventTitle}</strong>. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>Keep ticket</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={cancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelling ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Yes, cancel it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reallocate sheet */}
      <Sheet open={!!reallocateTarget} onOpenChange={(o) => { if (!o) { setReallocateTarget(null); setReallocateEmail(""); } }}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Reallocate Ticket</SheetTitle>
            <SheetDescription>
              Move <strong>{reallocateTarget?.ticketCode}</strong> ({reallocateTarget?.eventTitle}) to a different member.
              Enter their email address below.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-5">
            <div className="rounded-lg border border-border/50 bg-secondary/30 p-4 text-sm space-y-1">
              <p className="text-muted-foreground text-xs uppercase tracking-wide font-medium">Currently held by</p>
              <p className="font-medium">{reallocateTarget?.userName ?? "—"}</p>
              <p className="text-muted-foreground text-xs">{reallocateTarget?.userEmail}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newOwnerEmail">New owner's email</Label>
              <Input
                id="newOwnerEmail"
                type="email"
                placeholder="member@example.com"
                value={reallocateEmail}
                onChange={(e) => setReallocateEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !reallocating && handleReallocate()}
              />
              <p className="text-xs text-muted-foreground">Must match the email of an existing member account.</p>
            </div>

            <Button
              className="w-full"
              onClick={handleReallocate}
              disabled={reallocating || !reallocateEmail.trim()}
            >
              {reallocating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserCheck className="w-4 h-4 mr-2" />}
              Reallocate Ticket
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
