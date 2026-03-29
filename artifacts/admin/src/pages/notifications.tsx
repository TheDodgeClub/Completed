import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Bell, Send, Users, Clock } from "lucide-react";
import { formatDateTime } from "@/lib/format";

interface Announcement {
  id: number;
  title: string;
  body: string;
  sentCount: number;
  sentBy: string;
  createdAt: string;
}

interface MembersData {
  total: number;
  subscribed: number;
}

async function sendNotification(title: string, body: string): Promise<{ sent: number }> {
  return fetchApi<{ sent: number }>("/api/admin/notify", {
    method: "POST",
    body: JSON.stringify({ title, body }),
  });
}

async function fetchAnnouncements(): Promise<Announcement[]> {
  return fetchApi<Announcement[]>("/api/admin/announcements");
}

async function fetchMemberStats(): Promise<MembersData> {
  const members = await fetchApi<{ id: number; notificationsEnabled: boolean; pushToken: string | null }[]>("/api/admin/members");
  return {
    total: members.length,
    subscribed: members.filter(m => m.notificationsEnabled && m.pushToken?.startsWith("ExponentPushToken[")).length,
  };
}

export default function Notifications() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const { data: announcements, isLoading } = useQuery<Announcement[]>({
    queryKey: ["admin-announcements"],
    queryFn: fetchAnnouncements,
  });

  const { data: memberStats } = useQuery<MembersData>({
    queryKey: ["admin-member-stats-notif"],
    queryFn: fetchMemberStats,
  });

  const { mutate: send, isPending: sending } = useMutation({
    mutationFn: () => sendNotification(title.trim(), body.trim()),
    onSuccess: (data) => {
      toast({
        title: "Notification sent!",
        description: `Delivered to ${data.sent} member${data.sent !== 1 ? "s" : ""}.`,
      });
      setTitle("");
      setBody("");
      queryClient.invalidateQueries({ queryKey: ["admin-announcements"] });
    },
    onError: (err: any) => {
      toast({
        title: "Failed to send",
        description: err.message ?? "Something went wrong.",
        variant: "destructive",
      });
    },
  });

  const canSend = title.trim().length > 0 && body.trim().length > 0 && !sending;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <Bell className="w-7 h-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Push Notifications</h1>
          <p className="text-sm text-muted-foreground">Send a message to all members with notifications enabled.</p>
        </div>
      </div>

      {/* Subscriber count */}
      {memberStats && (
        <div className="flex gap-4">
          <div className="flex items-center gap-2 bg-muted/40 rounded-xl px-4 py-3 text-sm">
            <Users className="w-4 h-4 text-primary" />
            <span className="font-semibold text-foreground">{memberStats.subscribed}</span>
            <span className="text-muted-foreground">/ {memberStats.total} members subscribed</span>
          </div>
        </div>
      )}

      {/* Compose */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Compose notification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input
              placeholder="e.g. New event just dropped 🎉"
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={65}
            />
            <p className="text-xs text-muted-foreground text-right">{title.length}/65</p>
          </div>
          <div className="space-y-1.5">
            <Label>Message</Label>
            <Textarea
              placeholder="e.g. April Showdown tickets are now live — grab yours before they sell out!"
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={3}
              maxLength={178}
            />
            <p className="text-xs text-muted-foreground text-right">{body.length}/178</p>
          </div>

          {/* Preview */}
          {(title || body) && (
            <div className="border rounded-xl p-4 bg-muted/30 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Preview</p>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                  <Bell className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground leading-tight">{title || "Title"}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{body || "Message"}</p>
                </div>
              </div>
            </div>
          )}

          <Button
            className="w-full gap-2"
            disabled={!canSend}
            onClick={() => send()}
          >
            {sending ? (
              <>Sending…</>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send to {memberStats?.subscribed ?? "all"} subscriber{memberStats?.subscribed !== 1 ? "s" : ""}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* History */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Sent notifications</h2>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 rounded-xl bg-muted/30 animate-pulse" />
            ))}
          </div>
        ) : !announcements?.length ? (
          <div className="text-center py-12 text-muted-foreground">
            <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No notifications sent yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {announcements.map(a => (
              <Card key={a.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{a.title}</p>
                      <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{a.body}</p>
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                      {a.sentCount} sent
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {formatDateTime(a.createdAt)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
