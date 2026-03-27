import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEvents, useCreateEvent, useUpdateEvent, useDeleteEvent, usePublishEvent, useSetTicketPricing, useUpdateCheckoutForm, useDuplicateEvent, Event, EventInput, CheckoutField } from "@/hooks/use-events";
import { useTicketTypes, useCreateTicketType, useUpdateTicketType, useDeleteTicketType, useDiscountCodes, useCreateDiscountCode, useUpdateDiscountCode, useDeleteDiscountCode, TicketType, DiscountCode } from "@/hooks/use-ticket-types";
import { fetchApi } from "@/lib/api";
import { formatDateTime, toDateTimeInput } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit2, Trash2, MapPin, Users, CalendarDays, ArrowUpDown, ArrowUp, ArrowDown, Globe, EyeOff, CreditCard, CheckCircle, ClipboardList, X, GripVertical, Copy, Star, Tag, Percent, TicketIcon, Search, XCircle, UserCheck, Send, Gift, CheckCircle2, Loader2, ChevronDown, ChevronRight, Filter, Mail, Check } from "lucide-react";
import { ImageUploader } from "@/components/image-uploader";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";

type SortKey = "date" | "title" | "attendeeCount";
type SortDir = "asc" | "desc";

export default function Events() {
  const { data: events, isLoading } = useEvents();
  const [pageTab, setPageTab] = useState<"events" | "tickets">("events");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const { mutate: duplicate, isPending: isDuplicating } = useDuplicateEvent();
  const { toast } = useToast();

  const handleDuplicate = (event: Event) => {
    duplicate(event.id, {
      onSuccess: (copy) => toast({ title: `"${copy.title}" created as a draft` }),
      onError: () => toast({ title: "Failed to duplicate event", variant: "destructive" }),
    });
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const sorted = events ? [...events].sort((a, b) => {
    if (a.isUpcoming !== b.isUpcoming) return a.isUpcoming ? -1 : 1;
    let cmp = 0;
    if (sortKey === "date") cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
    else if (sortKey === "title") cmp = a.title.localeCompare(b.title);
    else if (sortKey === "attendeeCount") cmp = a.attendeeCount - b.attendeeCount;
    return sortDir === "asc" ? cmp : -cmp;
  }) : [];

  if (isLoading) return <div className="p-8 text-muted-foreground animate-pulse">Loading events...</div>;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Events & Tickets</h1>
          <p className="text-muted-foreground mt-1">Manage dodgeball sessions, tournaments, and socials.</p>
        </div>
        {pageTab === "events" && (
          <Button onClick={() => setIsCreateOpen(true)} className="bg-primary hover:bg-primary/90 text-white rounded-xl shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4 mr-2" /> New Event
          </Button>
        )}
      </div>

      {/* Page-level tab switcher */}
      <div className="flex gap-1 bg-secondary/40 p-1 rounded-xl w-fit border border-border/30">
        <button
          onClick={() => setPageTab("events")}
          className={`flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-medium transition-all ${pageTab === "events" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        >
          <CalendarDays className="w-3.5 h-3.5" /> Events
        </button>
        <button
          onClick={() => setPageTab("tickets")}
          className={`flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-medium transition-all ${pageTab === "tickets" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        >
          <TicketIcon className="w-3.5 h-3.5" /> Tickets
        </button>
      </div>

      {pageTab === "tickets" ? <TicketsTab /> : (
        <div className="space-y-3">
          {/* Sort bar */}
          {sorted.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
              <span>Sort:</span>
              {([["date", "Date"], ["title", "Title"], ["attendeeCount", "Attendees"]] as [SortKey, string][]).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => handleSort(k)}
                  className={`flex items-center gap-0.5 px-2 py-1 rounded-md transition-colors ${sortKey === k ? "bg-primary/10 text-primary font-semibold" : "hover:bg-secondary"}`}
                >
                  {label}
                  {sortKey === k && (sortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                </button>
              ))}
            </div>
          )}

          {sorted.length === 0 ? (
            <div className="bg-card border border-border/50 rounded-2xl p-16 text-center">
              <CalendarDays className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="font-medium text-muted-foreground">No events yet</p>
              <p className="text-sm text-muted-foreground/60 mt-1">Create your first event to get started.</p>
            </div>
          ) : (
            sorted.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                isExpanded={expandedId === event.id}
                onToggle={() => setExpandedId(expandedId === event.id ? null : event.id)}
                onDuplicate={() => handleDuplicate(event)}
                onDelete={() => setDeleteId(event.id)}
                isDuplicating={isDuplicating}
                toast={toast}
              />
            ))
          )}
        </div>
      )}

      {isCreateOpen && <EventFormModal onClose={() => setIsCreateOpen(false)} />}

      <DeleteConfirmDialog
        id={deleteId}
        onClose={() => setDeleteId(null)}
        useDeleteHook={useDeleteEvent}
        title="Delete Event"
        description="Are you sure? This will permanently delete the event and all associated attendance records."
      />
    </div>
  );
}

type CardTab = "details" | "tickets" | "checkout" | "email";

function EventCard({
  event, isExpanded, onToggle, onDuplicate, onDelete, isDuplicating, toast,
}: {
  event: Event;
  isExpanded: boolean;
  onToggle: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  isDuplicating: boolean;
  toast: any;
}) {
  const [cardTab, setCardTab] = useState<CardTab>("details");
  const { mutate: update, isPending: saving } = useUpdateEvent();
  const { mutate: publish } = usePublishEvent();

  const [title, setTitle] = useState(event.title);
  const [description, setDescription] = useState(event.description);
  const [date, setDate] = useState(toDateTimeInput(event.date));
  const [location, setLocation] = useState(event.location);
  const [ticketUrl, setTicketUrl] = useState(event.ticketUrl ?? "");
  const [imageUrl, setImageUrl] = useState(event.imageUrl ?? "");
  const [xpReward, setXpReward] = useState(String(event.xpReward ?? 50));
  const [checkInPin, setCheckInPin] = useState(event.checkInPin ?? "");
  const [eliteEarlyAccess, setEliteEarlyAccess] = useState(event.eliteEarlyAccess ?? false);
  const [eliteDiscountPercent, setEliteDiscountPercent] = useState(
    event.eliteDiscountPercent != null ? String(event.eliteDiscountPercent) : ""
  );

  const handlePublish = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !event.isPublished;
    publish({ id: event.id, publish: next }, {
      onSuccess: () => toast({ title: next ? "Event published to mobile" : "Event unpublished" }),
      onError: () => toast({ title: "Error", variant: "destructive" }),
    });
  };

  const handleSave = () => {
    update({
      id: event.id,
      title,
      description,
      date: new Date(date).toISOString(),
      location,
      ticketUrl: ticketUrl || null,
      imageUrl: imageUrl || null,
      xpReward: Number(xpReward) || 50,
      checkInPin: checkInPin || null,
      eliteEarlyAccess,
      eliteDiscountPercent: eliteDiscountPercent ? Number(eliteDiscountPercent) : null,
    } as any, {
      onSuccess: () => toast({ title: "Event saved" }),
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
  };

  const ticketSummary = () => {
    if (event.ticketTypeCount > 0) {
      const min = event.ticketTypeMinPrice ?? 0;
      const max = event.ticketTypeMaxPrice ?? 0;
      if (min === 0 && max === 0) return "Free";
      if (min === max) return `£${(min / 100).toFixed(2)}`;
      return `£${(min / 100).toFixed(2)}–£${(max / 100).toFixed(2)}`;
    }
    if (event.stripePriceId) return `£${event.ticketPrice?.toFixed(2)}`;
    if (event.ticketPrice === 0) return "Free";
    return null;
  };

  const summary = ticketSummary();

  return (
    <div className={`bg-card border rounded-2xl shadow-sm overflow-hidden transition-all duration-200 ${isExpanded ? "border-primary/40 shadow-md" : "border-border/50 hover:border-border"}`}>
      {/* ── Card header (always visible, clickable to expand) ── */}
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={e => (e.key === "Enter" || e.key === " ") && onToggle()}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-white/[0.02] transition-colors cursor-pointer"
      >
        <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />

        {/* Title + description */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-foreground">{event.title}</span>
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${event.isUpcoming
              ? "border-primary/40 text-primary bg-primary/5"
              : "border-muted-foreground/30 text-muted-foreground"}`}>
              {event.isUpcoming ? "Upcoming" : "Past"}
            </Badge>
          </div>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            <span className="text-xs text-muted-foreground">{formatDateTime(event.date)}</span>
            {event.location && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="w-3 h-3 text-primary shrink-0" />{event.location}
              </span>
            )}
          </div>
        </div>

        {/* Right side badges */}
        <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-1 text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-md">
            <Users className="w-3 h-3" />{event.attendeeCount}
          </div>
          {summary && (
            <div className="text-xs font-semibold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-md">
              <TicketIcon className="w-3 h-3 inline mr-1" />{summary}
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePublish}
            className={`h-7 px-2.5 rounded-lg text-xs font-semibold gap-1.5 ${event.isPublished
              ? "text-emerald-400 bg-emerald-400/10 hover:bg-emerald-400/20"
              : "text-muted-foreground bg-secondary hover:bg-secondary/80"}`}
          >
            {event.isPublished ? <Globe className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            {event.isPublished ? "Live" : "Draft"}
          </Button>
          <Button
            variant="ghost" size="icon"
            className="h-7 w-7 rounded-lg text-muted-foreground hover:text-violet-400 hover:bg-violet-400/10"
            onClick={onDuplicate} disabled={isDuplicating} title="Duplicate"
          >
            <Copy className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost" size="icon"
            className="h-7 w-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={onDelete} title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* ── Expanded panel ── */}
      {isExpanded && (
        <div className="border-t border-border/40">
          {/* Tab bar */}
          <div className="flex border-b border-border/30 px-2 pt-2 overflow-x-auto">
            {([ 
              { tab: "details" as CardTab, icon: CalendarDays, label: "Details" },
              { tab: "tickets" as CardTab, icon: TicketIcon, label: "Tickets" },
              { tab: "checkout" as CardTab, icon: ClipboardList, label: "Checkout" },
              { tab: "email" as CardTab, icon: Mail, label: "Email" },
            ]).map(({ tab, icon: Icon, label }) => (
              <button
                key={tab}
                onClick={() => setCardTab(tab)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
                  cardTab === tab
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="px-5 py-5">
            {cardTab === "details" && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Title</Label>
                    <Input value={title} onChange={e => setTitle(e.target.value)} className="bg-background border-border/50 rounded-xl h-9 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Location</Label>
                    <Input value={location} onChange={e => setLocation(e.target.value)} className="bg-background border-border/50 rounded-xl h-9 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Date & Time</Label>
                    <Input type="datetime-local" value={date} onChange={e => setDate(e.target.value)} className="bg-background border-border/50 rounded-xl h-9 text-sm dark:[color-scheme:dark]" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Ticket URL (Optional)</Label>
                    <Input type="url" value={ticketUrl} onChange={e => setTicketUrl(e.target.value)} placeholder="https://..." className="bg-background border-border/50 rounded-xl h-9 text-sm" />
                  </div>
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label className="text-xs">Description</Label>
                    <Textarea value={description} onChange={e => setDescription(e.target.value)} className="bg-background border-border/50 rounded-xl min-h-[80px] text-sm resize-none" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/20">
                    <Label className="text-xs text-emerald-400 font-semibold">⚡ XP Reward</Label>
                    <Input type="number" min={0} value={xpReward} onChange={e => setXpReward(e.target.value)} className="bg-background border-border/50 rounded-lg h-8 text-sm" />
                    <p className="text-[10px] text-muted-foreground">XP awarded on check-in</p>
                  </div>
                  <div className="space-y-1.5 p-3 bg-blue-500/5 rounded-xl border border-blue-500/20">
                    <Label className="text-xs text-blue-400 font-semibold">🔑 Check-In PIN</Label>
                    <Input
                      value={checkInPin}
                      onChange={e => setCheckInPin(e.target.value.toUpperCase())}
                      maxLength={8}
                      placeholder="e.g. DODGE7"
                      className="bg-background border-border/50 rounded-lg h-8 text-sm font-mono uppercase tracking-widest"
                    />
                    <p className="text-[10px] text-muted-foreground">Shown to door staff</p>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleSave} disabled={saving} className="rounded-xl bg-primary hover:bg-primary/90 text-white px-6">
                    {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</> : <><Check className="w-4 h-4 mr-2" />Save Changes</>}
                  </Button>
                </div>
              </div>
            )}
            {cardTab === "tickets" && <TicketPricingPanel event={event} toast={toast} />}
            {cardTab === "checkout" && <CheckoutFormPanel event={event} />}
            {cardTab === "email" && <EmailConfigPanel event={event} />}
          </div>
        </div>
      )}
    </div>
  );
}

const PRESET_FIELDS: Array<{ id: string; label: string; type: CheckoutField["type"] }> = [
  { id: "phone", label: "Phone Number", type: "phone" },
  { id: "dob", label: "Date of Birth", type: "date" },
  { id: "emergency_name", label: "Emergency Contact Name", type: "text" },
  { id: "emergency_phone", label: "Emergency Contact Phone", type: "phone" },
  { id: "medical_notes", label: "Medical Notes", type: "textarea" },
  { id: "tshirt_size", label: "T-Shirt Size", type: "select" },
];

const TSHIRT_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL"];

function CheckoutFormPanel({ event }: { event: Event }) {
  const { mutate: updateCheckout, isPending } = useUpdateCheckoutForm();
  const { toast } = useToast();
  const [fields, setFields] = useState<CheckoutField[]>(event.checkoutFields ?? []);
  const [waiverText, setWaiverText] = useState(event.waiverText ?? "");
  const [customLabel, setCustomLabel] = useState("");
  const [customType, setCustomType] = useState<CheckoutField["type"]>("text");

  const activeIds = new Set(fields.map((f) => f.id));

  const togglePreset = (preset: typeof PRESET_FIELDS[number]) => {
    if (activeIds.has(preset.id)) {
      setFields((f) => f.filter((x) => x.id !== preset.id));
    } else {
      const newField: CheckoutField = {
        id: preset.id,
        label: preset.label,
        type: preset.type,
        required: false,
        options: preset.id === "tshirt_size" ? TSHIRT_OPTIONS : undefined,
      };
      setFields((f) => [...f, newField]);
    }
  };

  const addCustomField = () => {
    const trimmed = customLabel.trim();
    if (!trimmed) return;
    const id = `custom_${Date.now()}`;
    setFields((f) => [...f, { id, label: trimmed, type: customType, required: false }]);
    setCustomLabel("");
  };

  const removeField = (id: string) => setFields((f) => f.filter((x) => x.id !== id));
  const toggleRequired = (id: string) =>
    setFields((f) => f.map((x) => (x.id === id ? { ...x, required: !x.required } : x)));

  const handleSave = () => {
    updateCheckout({ id: event.id, checkoutFields: fields, waiverText }, {
      onSuccess: () => { toast({ title: "Form & waiver saved" }); },
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
  };

  return (
    <div className="space-y-6">
          {/* Preset fields */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Quick-Add Fields</Label>
            <p className="text-xs text-muted-foreground">Toggle fields to include in the buyer form. Name and email are always collected.</p>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {PRESET_FIELDS.map((preset) => {
                const active = activeIds.has(preset.id);
                return (
                  <button
                    key={preset.id}
                    onClick={() => togglePreset(preset)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-colors ${
                      active
                        ? "border-blue-400/50 bg-blue-400/10 text-blue-300"
                        : "border-border/50 bg-background text-muted-foreground hover:border-blue-400/30 hover:text-foreground"
                    }`}
                  >
                    <CheckCircle className={`w-4 h-4 shrink-0 ${active ? "text-blue-400" : "text-muted-foreground/40"}`} />
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom field adder */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Add Custom Field</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Field label…"
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                className="bg-background border-border rounded-xl flex-1"
                onKeyDown={(e) => e.key === "Enter" && addCustomField()}
              />
              <select
                value={customType}
                onChange={(e) => setCustomType(e.target.value as CheckoutField["type"])}
                className="bg-background border border-border rounded-xl px-2 text-sm text-foreground"
              >
                <option value="text">Text</option>
                <option value="yes_no">Yes / No</option>
                <option value="select">Dropdown</option>
                <option value="email">Email</option>
                <option value="phone">Phone</option>
                <option value="date">Date</option>
                <option value="textarea">Long text</option>
              </select>
              <Button onClick={addCustomField} variant="outline" className="rounded-xl border-border/50 shrink-0">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Active fields list */}
          {fields.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Active Fields ({fields.length})</Label>
              <div className="space-y-2">
                {fields.map((field) => (
                  <div key={field.id} className="flex items-center gap-3 px-3 py-2 rounded-xl border border-border/50 bg-background">
                    <GripVertical className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                    <span className="flex-1 text-sm">{field.label}</span>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-md">{field.type === "yes_no" ? "yes / no" : field.type}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">Required</span>
                      <Switch
                        checked={field.required}
                        onCheckedChange={() => toggleRequired(field.id)}
                        className="scale-75"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 rounded-lg hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => removeField(field.id)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Waiver */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Waiver / Liability Agreement</Label>
            <p className="text-xs text-muted-foreground">If filled in, buyers must check an "I agree" box before purchase.</p>
            <Textarea
              placeholder="Participants must agree to the terms of participation…"
              value={waiverText}
              onChange={(e) => setWaiverText(e.target.value)}
              className="bg-background border-border rounded-xl min-h-[100px] text-sm"
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={handleSave} disabled={isPending} className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg">
              {isPending ? "Saving…" : "Save Form & Waiver"}
            </Button>
          </div>
        </div>
  );
}

function TicketPricingPanel({ event, toast }: { event: Event; toast: any }) {
  return (
    <div>
      <Tabs defaultValue="types">
        <TabsList className="rounded-xl bg-secondary/60 border border-border/30">
          <TabsTrigger value="types" className="rounded-lg gap-1.5"><TicketIcon className="w-3.5 h-3.5" /> Ticket Types</TabsTrigger>
          <TabsTrigger value="codes" className="rounded-lg gap-1.5"><Tag className="w-3.5 h-3.5" /> Discount Codes</TabsTrigger>
          <TabsTrigger value="legacy" className="rounded-lg gap-1.5"><CreditCard className="w-3.5 h-3.5" /> Base Pricing</TabsTrigger>
        </TabsList>
        <TabsContent value="types" className="pt-4 m-0">
          <TicketTypesTab event={event} toast={toast} />
        </TabsContent>
        <TabsContent value="codes" className="pt-4 m-0">
          <DiscountCodesTab event={event} toast={toast} />
        </TabsContent>
        <TabsContent value="legacy" className="pt-4 m-0">
          <LegacyPricingTab event={event} toast={toast} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TicketTypesTab({ event, toast }: { event: Event; toast: any }) {
  const { data: types, isLoading } = useTicketTypes(event.id);
  const { mutate: createType, isPending: creating } = useCreateTicketType(event.id);
  const { mutate: updateType, isPending: updating } = useUpdateTicketType(event.id);
  const { mutate: deleteType } = useDeleteTicketType(event.id);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", price: "", quantity: "", maxPerOrder: "", saleStartsAt: "", saleEndsAt: "", isActive: true });

  const resetForm = () => setForm({ name: "", description: "", price: "", quantity: "", maxPerOrder: "", saleStartsAt: "", saleEndsAt: "", isActive: true });

  const openEdit = (t: TicketType) => {
    setForm({
      name: t.name, description: t.description ?? "", price: (t.price / 100).toFixed(2),
      quantity: t.quantity != null ? String(t.quantity) : "",
      maxPerOrder: t.maxPerOrder != null ? String(t.maxPerOrder) : "",
      saleStartsAt: t.saleStartsAt ? t.saleStartsAt.slice(0, 16) : "",
      saleEndsAt: t.saleEndsAt ? t.saleEndsAt.slice(0, 16) : "",
      isActive: t.isActive,
    });
    setEditingId(t.id);
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!form.name) return;
    const payload = {
      name: form.name, description: form.description || null,
      price: parseFloat(form.price) || 0,
      quantity: form.quantity ? parseInt(form.quantity) : null,
      maxPerOrder: form.maxPerOrder ? parseInt(form.maxPerOrder) : null,
      saleStartsAt: form.saleStartsAt || null,
      saleEndsAt: form.saleEndsAt || null,
      isActive: form.isActive,
    };
    if (editingId !== null) {
      updateType({ id: editingId, ...payload }, {
        onSuccess: () => { toast({ title: "Ticket type updated" }); setShowForm(false); resetForm(); setEditingId(null); },
        onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
      });
    } else {
      createType(payload, {
        onSuccess: () => { toast({ title: "Ticket type created" }); setShowForm(false); resetForm(); },
        onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Add multiple ticket tiers (e.g. Early Bird, General, VIP) for this event.</p>
        <Button size="sm" className="rounded-xl gap-1.5" onClick={() => { resetForm(); setEditingId(null); setShowForm(true); }}>
          <Plus className="w-4 h-4" /> Add Type
        </Button>
      </div>
      {showForm && (
        <div className="rounded-xl border border-border/50 bg-secondary/30 p-4 space-y-3">
          <p className="text-sm font-semibold">{editingId !== null ? "Edit Ticket Type" : "New Ticket Type"}</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Name *</Label>
              <Input placeholder="e.g. Early Bird" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="bg-background border-border/50 rounded-lg h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Price (£)</Label>
              <Input type="number" min="0" step="0.50" placeholder="0.00" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} className="bg-background border-border/50 rounded-lg h-8 text-sm" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Description</Label>
            <Input placeholder="Optional description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="bg-background border-border/50 rounded-lg h-8 text-sm" />
          </div>
          <div className="grid grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Quantity (blank = unlimited)</Label>
              <Input type="number" min="1" placeholder="Unlimited" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} className="bg-background border-border/50 rounded-lg h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Max Per Order (blank = unlimited)</Label>
              <Input type="number" min="1" placeholder="Unlimited" value={form.maxPerOrder} onChange={e => setForm(f => ({ ...f, maxPerOrder: e.target.value }))} className="bg-background border-border/50 rounded-lg h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Sale Opens</Label>
              <Input type="datetime-local" value={form.saleStartsAt} onChange={e => setForm(f => ({ ...f, saleStartsAt: e.target.value }))} className="bg-background border-border/50 rounded-lg h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Sale Closes</Label>
              <Input type="datetime-local" value={form.saleEndsAt} onChange={e => setForm(f => ({ ...f, saleEndsAt: e.target.value }))} className="bg-background border-border/50 rounded-lg h-8 text-sm" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))} />
            <Label className="text-xs">Active (visible to buyers)</Label>
          </div>
          <div className="flex gap-2 pt-1">
            <Button size="sm" className="rounded-lg" onClick={handleSubmit} disabled={creating || updating}>
              {creating || updating ? "Saving..." : editingId !== null ? "Update" : "Create"}
            </Button>
            <Button size="sm" variant="outline" className="rounded-lg border-border/50" onClick={() => { setShowForm(false); resetForm(); setEditingId(null); }}>Cancel</Button>
          </div>
        </div>
      )}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : !types?.length ? (
        <div className="rounded-xl border border-dashed border-border/40 p-8 text-center">
          <TicketIcon className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No ticket types yet. Add one to enable multi-tier ticketing.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {types.map(t => (
            <div key={t.id} className="flex items-center gap-3 rounded-xl border border-border/40 bg-secondary/20 px-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{t.name}</span>
                  {!t.isActive && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                  {t.quantity !== null && t.quantitySold >= t.quantity && <Badge variant="destructive" className="text-xs">Sold Out</Badge>}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                  <span className="font-semibold text-foreground/80">£{(t.price / 100).toFixed(2)}</span>
                  {t.quantity !== null && <span>{t.quantitySold}/{t.quantity} sold</span>}
                  {t.description && <span className="truncate">{t.description}</span>}
                </div>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg" onClick={() => openEdit(t)}><Edit2 className="w-3.5 h-3.5" /></Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg hover:text-destructive" onClick={() => { if (confirm(`Delete "${t.name}"?`)) deleteType(t.id, { onSuccess: () => toast({ title: "Deleted" }), onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }) }); }}><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DiscountCodesTab({ event, toast }: { event: Event; toast: any }) {
  const { data: codes, isLoading } = useDiscountCodes(event.id);
  const { mutate: createCode, isPending: creating } = useCreateDiscountCode(event.id);
  const { mutate: updateCode, isPending: updating } = useUpdateDiscountCode(event.id);
  const { mutate: deleteCode } = useDeleteDiscountCode(event.id);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: "", discountType: "percent" as "percent" | "fixed", discountAmount: "", maxUses: "", expiresAt: "", isActive: true });

  const resetForm = () => setForm({ code: "", discountType: "percent", discountAmount: "", maxUses: "", expiresAt: "", isActive: true });

  const openEdit = (c: DiscountCode) => {
    setForm({
      code: c.code, discountType: c.discountType,
      discountAmount: c.discountType === "fixed" ? (c.discountAmount / 100).toFixed(2) : String(c.discountAmount),
      maxUses: c.maxUses != null ? String(c.maxUses) : "",
      expiresAt: c.expiresAt ? c.expiresAt.slice(0, 16) : "",
      isActive: c.isActive,
    });
    setEditingId(c.id);
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!form.code || !form.discountAmount) return;
    const payload = {
      code: form.code.toUpperCase().trim(),
      discountType: form.discountType,
      discountAmount: parseFloat(form.discountAmount) || 0,
      maxUses: form.maxUses ? parseInt(form.maxUses) : null,
      expiresAt: form.expiresAt || null,
      isActive: form.isActive,
    };
    if (editingId !== null) {
      updateCode({ id: editingId, ...payload }, {
        onSuccess: () => { toast({ title: "Discount code updated" }); setShowForm(false); resetForm(); setEditingId(null); },
        onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
      });
    } else {
      createCode(payload, {
        onSuccess: () => { toast({ title: "Discount code created" }); setShowForm(false); resetForm(); },
        onError: (e: any) => toast({ title: e.message?.includes("already exists") ? "Code already exists" : "Error", description: e.message, variant: "destructive" }),
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Create discount codes for this event (percent off or fixed amount).</p>
        <Button size="sm" className="rounded-xl gap-1.5" onClick={() => { resetForm(); setEditingId(null); setShowForm(true); }}>
          <Plus className="w-4 h-4" /> Add Code
        </Button>
      </div>
      {showForm && (
        <div className="rounded-xl border border-border/50 bg-secondary/30 p-4 space-y-3">
          <p className="text-sm font-semibold">{editingId !== null ? "Edit Discount Code" : "New Discount Code"}</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Code *</Label>
              <Input placeholder="DODGEBALL10" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} className="bg-background border-border/50 rounded-lg h-8 text-sm font-mono" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Discount Type</Label>
              <select value={form.discountType} onChange={e => setForm(f => ({ ...f, discountType: e.target.value as "percent" | "fixed" }))} className="w-full h-8 rounded-lg border border-border/50 bg-background text-sm px-2">
                <option value="percent">Percent (%)</option>
                <option value="fixed">Fixed (£)</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Amount {form.discountType === "percent" ? "(%)" : "(£)"}</Label>
              <Input type="number" min="0" step={form.discountType === "percent" ? "1" : "0.50"} placeholder={form.discountType === "percent" ? "10" : "5.00"} value={form.discountAmount} onChange={e => setForm(f => ({ ...f, discountAmount: e.target.value }))} className="bg-background border-border/50 rounded-lg h-8 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Max Uses (blank = unlimited)</Label>
              <Input type="number" min="1" placeholder="Unlimited" value={form.maxUses} onChange={e => setForm(f => ({ ...f, maxUses: e.target.value }))} className="bg-background border-border/50 rounded-lg h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Expires</Label>
              <Input type="datetime-local" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} className="bg-background border-border/50 rounded-lg h-8 text-sm" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))} />
            <Label className="text-xs">Active</Label>
          </div>
          <div className="flex gap-2 pt-1">
            <Button size="sm" className="rounded-lg" onClick={handleSubmit} disabled={creating || updating}>
              {creating || updating ? "Saving..." : editingId !== null ? "Update" : "Create"}
            </Button>
            <Button size="sm" variant="outline" className="rounded-lg border-border/50" onClick={() => { setShowForm(false); resetForm(); setEditingId(null); }}>Cancel</Button>
          </div>
        </div>
      )}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : !codes?.length ? (
        <div className="rounded-xl border border-dashed border-border/40 p-8 text-center">
          <Tag className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No discount codes yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {codes.map(c => (
            <div key={c.id} className="flex items-center gap-3 rounded-xl border border-border/40 bg-secondary/20 px-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold text-sm text-accent">{c.code}</span>
                  {!c.isActive && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                  {c.maxUses !== null && c.usesCount >= c.maxUses && <Badge variant="destructive" className="text-xs">Used Up</Badge>}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                  <span>{c.discountType === "percent" ? `${c.discountAmount}% off` : `£${(c.discountAmount / 100).toFixed(2)} off`}</span>
                  {c.maxUses !== null ? <span>{c.usesCount}/{c.maxUses} used</span> : <span>{c.usesCount} used</span>}
                  {c.expiresAt && <span>Expires {new Date(c.expiresAt).toLocaleDateString()}</span>}
                </div>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg" onClick={() => openEdit(c)}><Edit2 className="w-3.5 h-3.5" /></Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg hover:text-destructive" onClick={() => { if (confirm(`Delete code "${c.code}"?`)) deleteCode(c.id, { onSuccess: () => toast({ title: "Deleted" }), onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }) }); }}><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LegacyPricingTab({ event, toast, onClose }: { event: Event; toast: any; onClose?: () => void }) {
  const { mutate: setTicketPricing, isPending } = useSetTicketPricing();
  const [price, setPrice] = useState(event.ticketPrice != null ? String(event.ticketPrice) : "");
  const [capacity, setCapacity] = useState(event.ticketCapacity != null ? String(event.ticketCapacity) : "");

  const handleSave = () => {
    const priceNum = parseFloat(price) || 0;
    const capacityNum = parseInt(capacity) || undefined;
    setTicketPricing({ id: event.id, price: priceNum, capacity: capacityNum }, {
      onSuccess: () => { toast({ title: priceNum > 0 ? "Ticket pricing configured in Stripe" : "Event marked as free" }); onClose?.(); },
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3">
        <p className="text-xs text-amber-400">Use <strong>Ticket Types</strong> for multi-tier pricing. Base Pricing is for simple single-price events and is used as a fallback when no ticket types are defined.</p>
      </div>
      <div className="space-y-2">
        <Label>Ticket Price (£)</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">£</span>
          <Input type="number" min="0" step="0.50" placeholder="0.00" value={price} onChange={e => setPrice(e.target.value)} className="bg-background border-border rounded-xl pl-7" />
        </div>
        <p className="text-xs text-muted-foreground">Set to 0 for a free event.</p>
      </div>
      <div className="space-y-2">
        <Label>Capacity (optional)</Label>
        <Input type="number" min="1" placeholder="Unlimited" value={capacity} onChange={e => setCapacity(e.target.value)} className="bg-background border-border rounded-xl" />
      </div>
      {event.stripePriceId && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <p className="text-xs text-emerald-400">Stripe product active.</p>
        </div>
      )}
      <div className="flex gap-2 pt-2">
        <Button onClick={handleSave} disabled={isPending} className="rounded-xl bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20">
          {isPending ? "Saving to Stripe..." : "Save Pricing"}
        </Button>
      </div>
    </div>
  );
}

function EventFormModal({ event, onClose }: { event?: Event; onClose: () => void }) {
  const { mutate: create, isPending: creating } = useCreateEvent();
  const { mutate: update, isPending: updating } = useUpdateEvent();
  const { toast } = useToast();

  const { register, handleSubmit, setValue, watch } = useForm<EventInput>({
    defaultValues: event ? {
      title: event.title,
      description: event.description,
      date: toDateTimeInput(event.date),
      location: event.location,
      ticketUrl: event.ticketUrl || "",
      imageUrl: event.imageUrl || "",
      ticketPrice: event.ticketPrice,
      ticketCapacity: event.ticketCapacity,
      stripeProductId: event.stripeProductId,
      stripePriceId: event.stripePriceId,
      eliteEarlyAccess: event.eliteEarlyAccess ?? false,
      eliteDiscountPercent: event.eliteDiscountPercent ?? null,
      xpReward: event.xpReward ?? 50,
      checkInPin: event.checkInPin ?? "",
    } : {
      title: "", description: "", date: "", location: "", ticketUrl: "", imageUrl: "",
      ticketPrice: null, ticketCapacity: null, stripeProductId: null, stripePriceId: null,
      eliteEarlyAccess: false, eliteDiscountPercent: null,
      xpReward: 50, checkInPin: "",
    }
  });

  const eliteEarlyAccess = watch("eliteEarlyAccess");

  const onSubmit = (data: EventInput) => {
    const payload = {
      ...data,
      date: new Date(data.date).toISOString(),
      ticketUrl: data.ticketUrl || null,
      imageUrl: data.imageUrl || null,
    };

    if (event) {
      update({ id: event.id, ...payload }, {
        onSuccess: () => { toast({ title: "Event updated" }); onClose(); },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" })
      });
    } else {
      create(payload, {
        onSuccess: () => { toast({ title: "Event created" }); onClose(); },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" })
      });
    }
  };

  const pending = creating || updating;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] bg-card border-border/50 text-foreground max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
          <DialogTitle className="font-display text-xl">{event ? "Edit Event" : "Create New Event"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
        <div className="space-y-4 px-6 overflow-y-auto flex-1 pb-2">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input {...register("title", { required: true })} className="bg-background border-border rounded-xl" placeholder="Summer Tournament" />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea {...register("description", { required: true })} className="bg-background border-border rounded-xl min-h-[100px]" placeholder="Details about the event..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date & Time</Label>
              <Input type="datetime-local" {...register("date", { required: true })} className="bg-background border-border rounded-xl [color-scheme:dark]" />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input {...register("location", { required: true })} className="bg-background border-border rounded-xl" placeholder="Sports Hall" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Ticket URL (Optional)</Label>
            <Input type="url" {...register("ticketUrl")} className="bg-background border-border rounded-xl" placeholder="https://eventbrite.com/..." />
          </div>
          <ImageUploader
            label="Cover Image"
            value={watch("imageUrl") ?? ""}
            onChange={(url) => setValue("imageUrl", url || null)}
          />
          <div className="space-y-2 p-4 bg-emerald-500/5 rounded-xl border border-emerald-500/20">
            <Label className="text-emerald-400 font-semibold flex items-center gap-1.5 text-sm">
              ⚡ XP Reward for Attending
            </Label>
            <Input
              type="number"
              min={0}
              max={10000}
              {...register("xpReward", { valueAsNumber: true })}
              className="bg-background border-border rounded-xl h-9"
              placeholder="50"
            />
            <p className="text-xs text-muted-foreground">Base XP awarded to members who attend this event. Streak and milestone bonuses are added on top.</p>
          </div>

          <div className="space-y-2 p-4 bg-blue-500/5 rounded-xl border border-blue-500/20">
            <Label className="text-blue-400 font-semibold flex items-center gap-1.5 text-sm">
              🔑 Check-In PIN
            </Label>
            <Input
              {...register("checkInPin")}
              className="bg-background border-border rounded-xl h-9 uppercase tracking-widest font-mono"
              placeholder="e.g. DODGE7"
              maxLength={8}
              onChange={(e) => setValue("checkInPin", e.target.value.toUpperCase())}
            />
            <p className="text-xs text-muted-foreground">Members enter this PIN in the app to mark themselves as attending. Leave blank to disable PIN check-in. Shown to door staff in the scanner app.</p>
          </div>

          <div className="space-y-3 p-4 bg-yellow-500/5 rounded-xl border border-yellow-500/20">
            <Label className="text-yellow-500 font-semibold flex items-center gap-1.5 text-sm">
              <Star className="w-3.5 h-3.5" /> Elite Member Perks
            </Label>
            <div className="flex items-center space-x-3">
              <Checkbox
                id="eliteEarlyAccess"
                checked={eliteEarlyAccess}
                onCheckedChange={(c) => setValue("eliteEarlyAccess", c === true)}
                className="border-yellow-500/50 data-[state=checked]:bg-yellow-500 data-[state=checked]:border-yellow-500"
              />
              <div className="space-y-0.5 leading-none">
                <Label htmlFor="eliteEarlyAccess" className="font-medium cursor-pointer text-sm">Elite Early Ticket Access</Label>
                <p className="text-xs text-muted-foreground">Elite members can purchase tickets before general sale.</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Elite Discount % (leave blank for none)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                {...register("eliteDiscountPercent", { valueAsNumber: true })}
                className="bg-background border-border rounded-xl h-9"
                placeholder="e.g. 10 for 10% off"
              />
            </div>
          </div>
        </div>
          <div className="px-6 py-4 border-t border-border/30 flex justify-end gap-2 shrink-0">
            <Button type="button" variant="outline" onClick={onClose} disabled={pending} className="rounded-xl border-border/50 hover:bg-secondary">Cancel</Button>
            <Button type="submit" disabled={pending} className="rounded-xl bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20">
              {pending ? "Saving..." : "Save Event"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EmailConfigPanel({ event }: { event: Event }) {
  const { mutate: update, isPending: saving } = useUpdateEvent();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<"ticket" | "gift">("ticket");
  const [emailSubject, setEmailSubject] = useState(event.emailSubject ?? "");
  const [emailHeaderImageUrl, setEmailHeaderImageUrl] = useState(event.emailHeaderImageUrl ?? "");
  const [emailBodyText, setEmailBodyText] = useState(event.emailBodyText ?? "");
  const [emailCtaText, setEmailCtaText] = useState(event.emailCtaText ?? "");
  const [emailCtaUrl, setEmailCtaUrl] = useState(event.emailCtaUrl ?? "");
  const [emailVideoUrl, setEmailVideoUrl] = useState(event.emailVideoUrl ?? "");
  const [giftEmailSubject, setGiftEmailSubject] = useState(event.giftEmailSubject ?? "");
  const [giftEmailHeaderImageUrl, setGiftEmailHeaderImageUrl] = useState(event.giftEmailHeaderImageUrl ?? "");
  const [giftEmailBodyText, setGiftEmailBodyText] = useState(event.giftEmailBodyText ?? "");
  const [giftEmailCtaText, setGiftEmailCtaText] = useState(event.giftEmailCtaText ?? "");
  const [giftEmailCtaUrl, setGiftEmailCtaUrl] = useState(event.giftEmailCtaUrl ?? "");
  const [giftEmailVideoUrl, setGiftEmailVideoUrl] = useState(event.giftEmailVideoUrl ?? "");
  const [testEmail, setTestEmail] = useState("");
  const [isSendingTest, setIsSendingTest] = useState(false);

  const handleSendTest = async () => {
    if (!testEmail.trim()) { toast({ title: "Enter an email address to send the test to", variant: "destructive" }); return; }
    setIsSendingTest(true);
    try {
      const res = await fetchApi<{ ok: boolean; sentTo: string }>(`/api/admin/events/${event.id}/test-email`, {
        method: "POST",
        body: JSON.stringify({
          type: activeTab,
          toEmail: testEmail.trim(),
          emailSubject, emailHeaderImageUrl, emailBodyText, emailCtaText, emailCtaUrl, emailVideoUrl,
          giftEmailSubject, giftEmailHeaderImageUrl, giftEmailBodyText, giftEmailCtaText, giftEmailCtaUrl, giftEmailVideoUrl,
        }),
      });
      toast({ title: `Test email sent to ${res.sentTo}` });
    } catch (err: any) {
      toast({ title: "Failed to send test email", description: err.message, variant: "destructive" });
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleSave = () => {
    update({
      id: event.id,
      emailSubject: emailSubject || null,
      emailHeaderImageUrl: emailHeaderImageUrl || null,
      emailBodyText: emailBodyText || null,
      emailCtaText: emailCtaText || null,
      emailCtaUrl: emailCtaUrl || null,
      emailVideoUrl: emailVideoUrl || null,
      giftEmailSubject: giftEmailSubject || null,
      giftEmailHeaderImageUrl: giftEmailHeaderImageUrl || null,
      giftEmailBodyText: giftEmailBodyText || null,
      giftEmailCtaText: giftEmailCtaText || null,
      giftEmailCtaUrl: giftEmailCtaUrl || null,
      giftEmailVideoUrl: giftEmailVideoUrl || null,
    } as any, {
      onSuccess: () => { toast({ title: "Email templates saved" }); },
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Override default email templates for <span className="font-semibold text-foreground">{event.title}</span>. Leave blank to use global defaults.
      </p>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "ticket" | "gift")}>
        <TabsList className="rounded-xl bg-secondary/60 border border-border/30">
          <TabsTrigger value="ticket" className="rounded-lg gap-1.5 text-xs">
            <Send className="w-3.5 h-3.5" /> Ticket Confirmation
          </TabsTrigger>
          <TabsTrigger value="gift" className="rounded-lg gap-1.5 text-xs">
            <Gift className="w-3.5 h-3.5" /> Gift Ticket
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ticket" className="pt-4 m-0 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Subject Line</Label>
              <Input value={emailSubject} onChange={e => setEmailSubject(e.target.value)} className="bg-background border-border rounded-xl" placeholder="Your ticket for {event} is confirmed!" />
            </div>
            <ImageUploader
              label="Header Image"
              value={emailHeaderImageUrl}
              onChange={(url) => setEmailHeaderImageUrl(url || "")}
            />
            <div className="space-y-2">
              <Label className="text-xs">Video Link URL</Label>
              <Input value={emailVideoUrl} onChange={e => setEmailVideoUrl(e.target.value)} className="bg-background border-border rounded-xl" placeholder="https://youtube.com/..." />
              <p className="text-xs text-muted-foreground">Adds a "Watch Video" button in the email body.</p>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Email Body Text</Label>
              <Textarea value={emailBodyText} onChange={e => setEmailBodyText(e.target.value)} rows={5} className="bg-background border-border rounded-xl resize-none text-sm" placeholder={"Hey {{userName}},\n\nYou're in for {{eventName}} on {{eventDate}}!\n\nYour ticket details are below. See you on the court!"} />
              <div className="flex flex-wrap gap-1 items-center">
                <span className="text-xs text-muted-foreground">Available variables:</span>
                {["{{userName}}", "{{eventName}}", "{{eventDate}}", "{{eventLocation}}", "{{ticketCode}}"].map(v => (
                  <code key={v} className="bg-secondary text-foreground px-1.5 py-0.5 rounded text-[11px]">{v}</code>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Button Label</Label>
                <Input value={emailCtaText} onChange={e => setEmailCtaText(e.target.value)} className="bg-background border-border rounded-xl" placeholder="View Ticket" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Button URL</Label>
                <Input value={emailCtaUrl} onChange={e => setEmailCtaUrl(e.target.value)} className="bg-background border-border rounded-xl" placeholder="https://..." />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="gift" className="flex-1 overflow-y-auto px-6 pb-2 pt-4 m-0 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Subject Line</Label>
              <Input value={giftEmailSubject} onChange={e => setGiftEmailSubject(e.target.value)} className="bg-background border-border rounded-xl" placeholder="You've been gifted a ticket to {event}!" />
            </div>
            <ImageUploader
              label="Header Image"
              value={giftEmailHeaderImageUrl}
              onChange={(url) => setGiftEmailHeaderImageUrl(url || "")}
            />
            <div className="space-y-2">
              <Label className="text-xs">Video Link URL</Label>
              <Input value={giftEmailVideoUrl} onChange={e => setGiftEmailVideoUrl(e.target.value)} className="bg-background border-border rounded-xl" placeholder="https://youtube.com/..." />
              <p className="text-xs text-muted-foreground">Adds a "Watch Video" button in the gift email body.</p>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Email Body Text</Label>
              <Textarea value={giftEmailBodyText} onChange={e => setGiftEmailBodyText(e.target.value)} rows={5} className="bg-background border-border rounded-xl resize-none text-sm" placeholder="Great news, {recipient}! {gifter} has gifted you a ticket…" />
              <div className="flex flex-wrap gap-1 items-center">
                <span className="text-xs text-muted-foreground">Available variables:</span>
                {["{{recipientName}}", "{{gifterName}}", "{{eventName}}", "{{eventDate}}", "{{eventLocation}}"].map(v => (
                  <code key={v} className="bg-secondary text-foreground px-1.5 py-0.5 rounded text-[11px]">{v}</code>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Button Label</Label>
                <Input value={giftEmailCtaText} onChange={e => setGiftEmailCtaText(e.target.value)} className="bg-background border-border rounded-xl" placeholder="View Ticket" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Button URL</Label>
                <Input value={giftEmailCtaUrl} onChange={e => setGiftEmailCtaUrl(e.target.value)} className="bg-background border-border rounded-xl" placeholder="https://..." />
              </div>
            </div>
          </TabsContent>
        </Tabs>

      {/* Send test email */}
      <div className="pt-3 border-t border-border/30">
        <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
          <Send className="w-3 h-3" /> Send a test — uses the <span className="font-semibold text-foreground">{activeTab === "ticket" ? "Ticket Confirmation" : "Gift Ticket"}</span> template with current values
        </p>
        <div className="flex gap-2">
          <Input
            type="email"
            value={testEmail}
            onChange={e => setTestEmail(e.target.value)}
            placeholder="your@email.com"
            className="bg-background border-border/50 rounded-xl h-9 text-sm"
            onKeyDown={e => e.key === "Enter" && handleSendTest()}
          />
          <Button
            variant="outline"
            onClick={handleSendTest}
            disabled={isSendingTest || !testEmail.trim()}
            className="shrink-0 rounded-xl border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 gap-1.5"
          >
            {isSendingTest ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            {isSendingTest ? "Sending…" : "Send Test"}
          </Button>
        </div>
      </div>

      <div className="pt-3 border-t border-border/30 flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white">
          {saving ? "Saving…" : "Save Templates"}
        </Button>
      </div>
    </div>
  );
}

export function DeleteConfirmDialog({
  id, onClose, useDeleteHook, title, description
}: {
  id: number | null, onClose: () => void, useDeleteHook: any, title: string, description: string
}) {
  const { mutate, isPending } = useDeleteHook();
  const { toast } = useToast();

  const handleConfirm = () => {
    if (!id) return;
    mutate(id, {
      onSuccess: () => {
        toast({ title: "Deleted successfully" });
        onClose();
      },
      onError: (err: any) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
        onClose();
      }
    });
  };

  return (
    <AlertDialog open={id !== null} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="bg-card border-border/50 text-foreground">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground">{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose} className="rounded-xl border-border/50 hover:bg-secondary">Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={isPending} className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {isPending ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── Tickets Tab ────────────────────────────────────────────────────────────

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
  checkoutData: Record<string, string> | null;
  checkoutFields: CheckoutField[] | null;
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

function TicketsTab() {
  const { data: tickets, isLoading } = useAdminTickets();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [eventFilter, setEventFilter] = useState("all");
  const [fieldFilters, setFieldFilters] = useState<Record<string, string>>({});
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [cancelTarget, setCancelTarget] = useState<AdminTicket | null>(null);
  const [reallocateTarget, setReallocateTarget] = useState<AdminTicket | null>(null);
  const [reallocateEmail, setReallocateEmail] = useState("");
  const [resending, setResending] = useState<number | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [reallocating, setReallocating] = useState(false);

  const events = useMemo(() => {
    if (!tickets) return [];
    const seen = new Set<number>();
    return tickets
      .filter(t => { if (seen.has(t.eventId)) return false; seen.add(t.eventId); return true; })
      .map(t => ({ id: t.eventId, title: t.eventTitle }))
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [tickets]);

  // Fields for the currently selected event (so we know what filters to show)
  const currentEventFields = useMemo<CheckoutField[]>(() => {
    if (eventFilter === "all" || !tickets) return [];
    const eventId = Number(eventFilter);
    const eventTicket = tickets.find(t => t.eventId === eventId);
    return eventTicket?.checkoutFields ?? [];
  }, [tickets, eventFilter]);

  // When event filter changes, clear field-specific filters
  const handleEventFilterChange = (val: string) => {
    setEventFilter(val);
    setFieldFilters({});
    setExpandedRows(new Set());
  };

  const toggleRow = (id: number) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filtered = useMemo(() => {
    if (!tickets) return [];
    const q = search.toLowerCase();
    return tickets.filter(t => {
      if (eventFilter !== "all" && t.eventId !== Number(eventFilter)) return false;
      // Per-field filters
      for (const [fieldId, filterVal] of Object.entries(fieldFilters)) {
        if (!filterVal) continue;
        const answer = (t.checkoutData?.[fieldId] ?? "").toLowerCase();
        if (!answer.includes(filterVal.toLowerCase())) return false;
      }
      if (!q) return true;
      // Search in core fields + all checkout answers (skip internal __ keys)
      const checkoutValues = Object.entries(t.checkoutData ?? {}).filter(([k]) => !k.startsWith("__")).map(([, v]) => v).join(" ").toLowerCase();
      return (
        (t.userName ?? "").toLowerCase().includes(q) ||
        t.userEmail.toLowerCase().includes(q) ||
        t.ticketCode.toLowerCase().includes(q) ||
        t.eventTitle.toLowerCase().includes(q) ||
        (t.giftRecipientEmail ?? "").toLowerCase().includes(q) ||
        checkoutValues.includes(q)
      );
    });
  }, [tickets, search, eventFilter, fieldFilters]);

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
    <div className="space-y-6">
      {/* Search + filter row */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 bg-card border border-border/50 rounded-xl px-4 py-2 shadow-lg shadow-black/5 flex-1 min-w-[200px] max-w-md">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <Input
              className="border-0 bg-transparent focus-visible:ring-0 px-1 h-9 shadow-none text-foreground"
              placeholder="Search member, code, event, form answers…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            value={eventFilter}
            onChange={(e) => handleEventFilterChange(e.target.value)}
            className="rounded-xl border border-border/50 bg-card text-foreground text-sm px-3 py-2 shadow-lg shadow-black/5 focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="all">All events</option>
            {events.map(e => (
              <option key={e.id} value={e.id}>{e.title}</option>
            ))}
          </select>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground self-center ml-1">
            <TicketIcon className="w-4 h-4" />
            {filtered.length} ticket{filtered.length !== 1 ? "s" : ""}
          </div>
        </div>

        {/* Per-field filters — only shown when a specific event is selected and it has checkout fields */}
        {currentEventFields.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <Filter className="w-3.5 h-3.5" />
              Filter by answer:
            </div>
            {currentEventFields.map(field => {
              const val = fieldFilters[field.id] ?? "";
              // For yes_no fields: show Yes / No buttons
              if (field.type === "yes_no") {
                return (
                  <div key={field.id} className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground mr-1">{field.label}:</span>
                    {["", "Yes", "No"].map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setFieldFilters(prev => ({ ...prev, [field.id]: opt }))}
                        className={`rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
                          (fieldFilters[field.id] ?? "") === opt
                            ? "border-primary bg-primary/10 text-primary font-medium"
                            : "border-border/50 bg-card text-muted-foreground hover:border-primary/30"
                        }`}
                      >
                        {opt === "" ? "All" : opt}
                      </button>
                    ))}
                  </div>
                );
              }
              // For select fields: show a dropdown of options
              if (field.type === "select" && field.options?.length) {
                return (
                  <select
                    key={field.id}
                    value={val}
                    onChange={e => setFieldFilters(prev => ({ ...prev, [field.id]: e.target.value }))}
                    className="rounded-lg border border-border/50 bg-card text-foreground text-xs px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="">{field.label}: All</option>
                    {field.options.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                );
              }
              // For other field types: text input
              return (
                <div key={field.id} className="relative">
                  <Input
                    className="h-8 text-xs rounded-lg pr-6 border-border/50 bg-card min-w-[140px] max-w-[180px]"
                    placeholder={field.label}
                    value={val}
                    onChange={e => setFieldFilters(prev => ({ ...prev, [field.id]: e.target.value }))}
                  />
                  {val && (
                    <button
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setFieldFilters(prev => { const n = { ...prev }; delete n[field.id]; return n; })}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
            {Object.values(fieldFilters).some(Boolean) && (
              <button
                className="text-xs text-muted-foreground hover:text-foreground underline"
                onClick={() => setFieldFilters({})}
              >
                Clear all
              </button>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-lg shadow-black/10">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-secondary/50 border-b border-border/50">
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-muted-foreground py-4 px-6 w-8"></TableHead>
                <TableHead className="text-muted-foreground py-4">Member</TableHead>
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
                  <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading tickets…
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                    {search || eventFilter !== "all" || Object.values(fieldFilters).some(Boolean) ? "No tickets match your filters." : "No tickets yet."}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((ticket) => {
                  const hasAnswers = ticket.checkoutData && Object.keys(ticket.checkoutData).length > 0;
                  const isExpanded = expandedRows.has(ticket.id);
                  // Resolve field labels from the event's checkout fields
                  const fields = ticket.checkoutFields ?? [];
                  return (
                    <React.Fragment key={ticket.id}>
                      <TableRow className={`border-b border-border/30 hover:bg-secondary/20 transition-colors ${isExpanded ? "bg-secondary/10" : ""}`}>
                        <TableCell className="py-4 px-3 w-8">
                          {hasAnswers ? (
                            <button
                              onClick={() => toggleRow(ticket.id)}
                              className="text-muted-foreground hover:text-foreground transition-colors"
                              title={isExpanded ? "Hide form answers" : "Show form answers"}
                            >
                              {isExpanded
                                ? <ChevronDown className="w-4 h-4" />
                                : <ChevronRight className="w-4 h-4" />}
                            </button>
                          ) : null}
                        </TableCell>
                        <TableCell className="py-4">
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
                        <TableCell className="py-4">
                          <div>
                            <p className="text-sm font-medium leading-tight">{ticket.eventTitle}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(ticket.eventDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <code className="text-xs font-mono bg-secondary/50 px-2 py-1 rounded-md tracking-wider">
                            {ticket.ticketCode}
                          </code>
                        </TableCell>
                        <TableCell className="py-4 text-center text-sm">
                          {formatAmount(ticket.amountPaid)}
                        </TableCell>
                        <TableCell className="py-4 text-center">
                          {ticket.checkedIn ? (
                            <Badge className="bg-green-500/15 text-green-500 border-green-500/20 gap-1 text-xs">
                              <CheckCircle2 className="w-3 h-3" /> Checked In
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs text-muted-foreground">Not yet</Badge>
                          )}
                        </TableCell>
                        <TableCell className="py-4 text-sm text-muted-foreground whitespace-nowrap">
                          {formatDateTime(ticket.createdAt)}
                        </TableCell>
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
                      {isExpanded && hasAnswers && (
                        <TableRow key={`${ticket.id}-answers`} className="bg-secondary/10 border-b border-border/30">
                          <TableCell colSpan={8} className="py-0 px-0">
                            <div className="px-12 py-3 border-t border-border/20">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                                <ClipboardList className="w-3.5 h-3.5" /> Checkout Form Answers
                              </p>
                              {ticket.checkoutData!.__waiver_signed === "true" && (
                                <div className="flex items-center gap-1.5 mb-2">
                                  <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                                  <span className="text-xs font-semibold text-green-600">Waiver digitally signed</span>
                                </div>
                              )}
                              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-2">
                                {Object.entries(ticket.checkoutData!).filter(([k]) => !k.startsWith("__")).map(([fieldId, answer]) => {
                                  const fieldDef = fields.find(f => f.id === fieldId);
                                  const label = fieldDef?.label ?? fieldId;
                                  return (
                                    <div key={fieldId}>
                                      <p className="text-xs text-muted-foreground leading-tight">{label}</p>
                                      <p className="text-sm font-medium leading-snug break-words">{answer || "—"}</p>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })
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
