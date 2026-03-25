import { useState } from "react";
import { useEvents, useCreateEvent, useUpdateEvent, useDeleteEvent, Event, EventInput } from "@/hooks/use-events";
import { formatDateTime, toDateTimeInput } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit2, Trash2, MapPin, Users, Ticket, Image as ImageIcon } from "lucide-react";
import { useForm } from "react-hook-form";

export default function Events() {
  const { data: events, isLoading } = useEvents();
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  if (isLoading) return <div className="p-8 text-muted-foreground animate-pulse">Loading events...</div>;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Events</h1>
          <p className="text-muted-foreground mt-1">Manage dodgeball sessions, tournaments, and socials.</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="bg-primary hover:bg-primary/90 text-white rounded-xl shadow-lg shadow-primary/20">
          <Plus className="w-4 h-4 mr-2" /> New Event
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {events?.map((event) => (
          <Card key={event.id} className="bg-card border-border/50 hover:border-border transition-colors overflow-hidden flex flex-col sm:flex-row shadow-lg shadow-black/10">
            {event.imageUrl ? (
              <div className="w-full sm:w-48 h-48 sm:h-auto shrink-0 relative bg-secondary">
                <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent sm:hidden" />
              </div>
            ) : (
              <div className="w-full sm:w-48 h-48 sm:h-auto shrink-0 bg-secondary/50 flex items-center justify-center border-r border-border/50">
                <ImageIcon className="w-8 h-8 text-muted-foreground/30" />
              </div>
            )}
            
            <div className="p-5 flex-1 flex flex-col relative">
              <div className="absolute top-4 right-4 flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg bg-background/50 backdrop-blur border-border/50 hover:bg-primary/10 hover:text-primary" onClick={() => setEditingEvent(event)}>
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg bg-background/50 backdrop-blur border-border/50 hover:bg-destructive/10 hover:text-destructive" onClick={() => setDeleteId(event.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex gap-2 items-center mb-2">
                <Badge variant="outline" className={event.isUpcoming ? "border-primary text-primary bg-primary/5" : "border-muted-foreground text-muted-foreground"}>
                  {event.isUpcoming ? "Upcoming" : "Past"}
                </Badge>
                <span className="text-xs font-semibold text-muted-foreground">{formatDateTime(event.date)}</span>
              </div>
              
              <h3 className="font-display font-bold text-xl text-foreground pr-20">{event.title}</h3>
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{event.description}</p>
              
              <div className="mt-auto pt-4 flex flex-wrap gap-4 text-sm font-medium text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-primary" /> {event.location}
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-accent" /> {event.attendeeCount} Attendees
                </div>
                {event.ticketUrl && (
                  <a href={event.ticketUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300">
                    <Ticket className="w-4 h-4" /> Tickets
                  </a>
                )}
              </div>
            </div>
          </Card>
        ))}
        {events?.length === 0 && (
          <div className="col-span-full p-12 text-center border-2 border-dashed border-border/50 rounded-2xl">
            <CalendarDays className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-foreground">No events found</h3>
            <p className="text-muted-foreground">Create an event to get started.</p>
          </div>
        )}
      </div>

      {isCreateOpen && <EventFormModal onClose={() => setIsCreateOpen(false)} />}
      {editingEvent && <EventFormModal event={editingEvent} onClose={() => setEditingEvent(null)} />}
      
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

function EventFormModal({ event, onClose }: { event?: Event; onClose: () => void }) {
  const { mutate: create, isPending: creating } = useCreateEvent();
  const { mutate: update, isPending: updating } = useUpdateEvent();
  const { toast } = useToast();
  
  const { register, handleSubmit } = useForm<EventInput>({
    defaultValues: event ? {
      title: event.title,
      description: event.description,
      date: toDateTimeInput(event.date),
      location: event.location,
      ticketUrl: event.ticketUrl || "",
      imageUrl: event.imageUrl || "",
    } : {
      title: "", description: "", date: "", location: "", ticketUrl: "", imageUrl: ""
    }
  });

  const onSubmit = (data: EventInput) => {
    // Clean up empty strings to undefined
    const payload = {
      ...data,
      date: new Date(data.date).toISOString(),
      ticketUrl: data.ticketUrl || undefined,
      imageUrl: data.imageUrl || undefined,
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
          <div className="space-y-2">
            <Label>Cover Image URL (Optional)</Label>
            <Input type="url" {...register("imageUrl")} className="bg-background border-border rounded-xl" placeholder="https://..." />
          </div>
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
