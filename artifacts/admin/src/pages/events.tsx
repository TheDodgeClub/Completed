import { useState } from "react";
import { useEvents, useCreateEvent, useUpdateEvent, useDeleteEvent, usePublishEvent, useSetTicketPricing, useUpdateCheckoutForm, Event, EventInput, CheckoutField } from "@/hooks/use-events";
import { formatDateTime, toDateTimeInput } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit2, Trash2, MapPin, Users, CalendarDays, ArrowUpDown, ArrowUp, ArrowDown, Globe, EyeOff, CreditCard, CheckCircle, ClipboardList, X, GripVertical } from "lucide-react";
import { ImageUploader } from "@/components/image-uploader";
import { useForm } from "react-hook-form";

type SortKey = "date" | "title" | "attendeeCount";
type SortDir = "asc" | "desc";

export default function Events() {
  const { data: events, isLoading } = useEvents();
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [ticketEvent, setTicketEvent] = useState<Event | null>(null);
  const [checkoutEvent, setCheckoutEvent] = useState<Event | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const { mutate: publish } = usePublishEvent();
  const { toast } = useToast();

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sorted = events ? [...events].sort((a, b) => {
    if (a.isUpcoming !== b.isUpcoming) return a.isUpcoming ? -1 : 1;
    let cmp = 0;
    if (sortKey === "date") cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
    else if (sortKey === "title") cmp = a.title.localeCompare(b.title);
    else if (sortKey === "attendeeCount") cmp = a.attendeeCount - b.attendeeCount;
    return sortDir === "asc" ? cmp : -cmp;
  }) : [];

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="w-3.5 h-3.5 ml-1 opacity-40" />;
    return sortDir === "asc"
      ? <ArrowUp className="w-3.5 h-3.5 ml-1 text-primary" />
      : <ArrowDown className="w-3.5 h-3.5 ml-1 text-primary" />;
  };

  const handlePublish = (event: Event) => {
    const next = !event.isPublished;
    publish({ id: event.id, publish: next }, {
      onSuccess: () => toast({ title: next ? "Event published to mobile" : "Event unpublished" }),
      onError: () => toast({ title: "Error", variant: "destructive" }),
    });
  };

  if (isLoading) return <div className="p-8 text-muted-foreground animate-pulse">Loading events...</div>;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Events</h1>
          <p className="text-muted-foreground mt-1">Manage dodgeball sessions, tournaments, and socials. Publish events to make them visible in the mobile app.</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="bg-primary hover:bg-primary/90 text-white rounded-xl shadow-lg shadow-primary/20">
          <Plus className="w-4 h-4 mr-2" /> New Event
        </Button>
      </div>

      <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-lg shadow-black/10">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-secondary/50 border-b border-border/50">
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-muted-foreground py-4 px-6">Status</TableHead>
                <TableHead className="text-muted-foreground py-4 px-4">Published</TableHead>
                <TableHead
                  className="text-muted-foreground py-4 cursor-pointer select-none hover:text-foreground transition-colors"
                  onClick={() => handleSort("title")}
                >
                  <span className="flex items-center">Title <SortIcon col="title" /></span>
                </TableHead>
                <TableHead
                  className="text-muted-foreground py-4 cursor-pointer select-none hover:text-foreground transition-colors"
                  onClick={() => handleSort("date")}
                >
                  <span className="flex items-center">Date <SortIcon col="date" /></span>
                </TableHead>
                <TableHead className="text-muted-foreground py-4">Location</TableHead>
                <TableHead
                  className="text-muted-foreground py-4 text-center cursor-pointer select-none hover:text-foreground transition-colors"
                  onClick={() => handleSort("attendeeCount")}
                >
                  <span className="flex items-center justify-center">Attendees <SortIcon col="attendeeCount" /></span>
                </TableHead>
                <TableHead className="text-muted-foreground py-4 text-center">Tickets</TableHead>
                <TableHead className="text-muted-foreground py-4 px-6 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-40 text-center text-muted-foreground">
                    <CalendarDays className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="font-medium">No events yet</p>
                    <p className="text-sm">Create your first event to get started.</p>
                  </TableCell>
                </TableRow>
              ) : (
                sorted.map((event) => (
                  <TableRow key={event.id} className="group border-border/50 hover:bg-white/[0.02] transition-colors">
                    <TableCell className="px-6 py-4">
                      <Badge variant="outline" className={event.isUpcoming
                        ? "border-primary text-primary bg-primary/5"
                        : "border-muted-foreground/30 text-muted-foreground bg-secondary/30"
                      }>
                        {event.isUpcoming ? "Upcoming" : "Past"}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePublish(event)}
                        className={`h-7 px-2.5 rounded-lg text-xs font-semibold gap-1.5 ${event.isPublished
                          ? "text-emerald-400 bg-emerald-400/10 hover:bg-emerald-400/20"
                          : "text-muted-foreground bg-secondary hover:bg-secondary/80"
                        }`}
                        title={event.isPublished ? "Click to unpublish" : "Click to publish to mobile"}
                      >
                        {event.isPublished ? <Globe className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        {event.isPublished ? "Live" : "Draft"}
                      </Button>
                    </TableCell>
                    <TableCell className="py-4">
                      <div>
                        <div className="font-semibold text-foreground group-hover:text-primary transition-colors">{event.title}</div>
                        <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{event.description}</div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4 text-sm text-foreground whitespace-nowrap">
                      {formatDateTime(event.date)}
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="line-clamp-1">{event.location}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4 text-center">
                      <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-secondary text-foreground font-semibold text-sm">
                        <Users className="w-3.5 h-3.5 text-accent" /> {event.attendeeCount}
                      </div>
                    </TableCell>
                    <TableCell className="py-4 text-center">
                      {event.stripePriceId ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <div className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400">
                            <CheckCircle className="w-3.5 h-3.5" />
                            £{event.ticketPrice?.toFixed(2)}
                          </div>
                          {event.ticketCapacity && (
                            <div className="text-xs text-muted-foreground">Cap: {event.ticketCapacity}</div>
                          )}
                        </div>
                      ) : event.ticketPrice === 0 ? (
                        <span className="text-xs font-semibold text-blue-400">Free</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg hover:bg-accent/10 hover:text-accent"
                          onClick={() => setTicketEvent(event)}
                          title="Configure ticket pricing"
                        >
                          <CreditCard className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg hover:bg-blue-400/10 hover:text-blue-400"
                          onClick={() => setCheckoutEvent(event)}
                          title="Edit checkout form & waiver"
                        >
                          <ClipboardList className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary"
                          onClick={() => setEditingEvent(event)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setDeleteId(event.id)}
                        >
                          <Trash2 className="w-4 h-4" />
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

      {isCreateOpen && <EventFormModal onClose={() => setIsCreateOpen(false)} />}
      {editingEvent && <EventFormModal event={editingEvent} onClose={() => setEditingEvent(null)} />}
      {ticketEvent && <TicketPricingModal event={ticketEvent} onClose={() => setTicketEvent(null)} />}
      {checkoutEvent && <CheckoutFormModal event={checkoutEvent} onClose={() => setCheckoutEvent(null)} />}

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

const PRESET_FIELDS: Array<{ id: string; label: string; type: CheckoutField["type"] }> = [
  { id: "phone", label: "Phone Number", type: "phone" },
  { id: "dob", label: "Date of Birth", type: "date" },
  { id: "emergency_name", label: "Emergency Contact Name", type: "text" },
  { id: "emergency_phone", label: "Emergency Contact Phone", type: "phone" },
  { id: "medical_notes", label: "Medical Notes", type: "textarea" },
  { id: "tshirt_size", label: "T-Shirt Size", type: "select" },
];

const TSHIRT_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL"];

function CheckoutFormModal({ event, onClose }: { event: Event; onClose: () => void }) {
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
      onSuccess: () => { toast({ title: "Form & waiver saved" }); onClose(); },
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto bg-card border-border/50 text-foreground">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-blue-400" /> Checkout Form & Waiver
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Configure what buyers must fill out before purchasing a ticket for <span className="text-foreground font-medium">{event.title}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
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
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-md">{field.type}</span>
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
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={onClose} disabled={isPending} className="rounded-xl border-border/50 hover:bg-secondary">Cancel</Button>
          <Button onClick={handleSave} disabled={isPending} className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg">
            {isPending ? "Saving…" : "Save Form & Waiver"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TicketPricingModal({ event, onClose }: { event: Event; onClose: () => void }) {
  const { mutate: setTicketPricing, isPending } = useSetTicketPricing();
  const { toast } = useToast();
  const [price, setPrice] = useState(event.ticketPrice != null ? String(event.ticketPrice) : "");
  const [capacity, setCapacity] = useState(event.ticketCapacity != null ? String(event.ticketCapacity) : "");

  const handleSave = () => {
    const priceNum = parseFloat(price) || 0;
    const capacityNum = parseInt(capacity) || undefined;
    setTicketPricing({ id: event.id, price: priceNum, capacity: capacityNum }, {
      onSuccess: () => { toast({ title: priceNum > 0 ? "Ticket pricing configured in Stripe" : "Event marked as free" }); onClose(); },
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[420px] bg-card border-border/50 text-foreground">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-accent" /> Configure Tickets
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Set a ticket price for <span className="text-foreground font-medium">{event.title}</span>. Leave price at 0 for a free event.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Ticket Price (£)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">£</span>
              <Input
                type="number"
                min="0"
                step="0.50"
                placeholder="0.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="bg-background border-border rounded-xl pl-7"
              />
            </div>
            <p className="text-xs text-muted-foreground">Set to 0 for a free event. Paid events create a Stripe product automatically.</p>
          </div>
          <div className="space-y-2">
            <Label>Capacity (optional)</Label>
            <Input
              type="number"
              min="1"
              placeholder="Unlimited"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              className="bg-background border-border rounded-xl"
            />
            <p className="text-xs text-muted-foreground">Maximum number of tickets that can be sold.</p>
          </div>
          {event.stripePriceId && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <p className="text-xs text-emerald-400">Stripe product active. Updating price will archive the old one.</p>
            </div>
          )}
        </div>
        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={onClose} disabled={isPending} className="rounded-xl border-border/50 hover:bg-secondary">Cancel</Button>
          <Button onClick={handleSave} disabled={isPending} className="rounded-xl bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20">
            {isPending ? "Saving to Stripe..." : "Save Pricing"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
    } : {
      title: "", description: "", date: "", location: "", ticketUrl: "", imageUrl: "",
      ticketPrice: null, ticketCapacity: null, stripeProductId: null, stripePriceId: null,
    }
  });

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
      <DialogContent className="sm:max-w-[500px] bg-card border-border/50 text-foreground">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{event ? "Edit Event" : "Create New Event"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
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
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={pending} className="rounded-xl border-border/50 hover:bg-secondary">Cancel</Button>
            <Button type="submit" disabled={pending} className="rounded-xl bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20">
              {pending ? "Saving..." : "Save Event"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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
