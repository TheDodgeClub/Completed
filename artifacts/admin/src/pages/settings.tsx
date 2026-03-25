import { useEffect, useState, useCallback } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Video, Mail, Send, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { fetchApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const TEMPLATE_VARS = [
  { key: "{{userName}}", desc: "Member's name" },
  { key: "{{eventName}}", desc: "Event title" },
  { key: "{{eventDate}}", desc: "Formatted date" },
  { key: "{{eventLocation}}", desc: "Venue / location" },
  { key: "{{ticketCode}}", desc: "Unique ticket code" },
];

const DEFAULT_SUBJECT = "Your ticket is confirmed! 🎉";
const DEFAULT_FROM_NAME = "The Dodge Club";
const DEFAULT_FROM_EMAIL = "noreply@dodgeclub.com";

interface EmailSettings {
  emailFromName: string;
  emailFromAddress: string;
  emailSubject: string;
  emailBodyHtml: string;
}

export default function SettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const [fromName, setFromName] = useState(DEFAULT_FROM_NAME);
  const [fromEmail, setFromEmail] = useState(DEFAULT_FROM_EMAIL);
  const [subject, setSubject] = useState(DEFAULT_SUBJECT);
  const [bodyHtml, setBodyHtml] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await fetchApi<Record<string, string>>("/api/settings/admin");
      setFromName(data.emailFromName ?? DEFAULT_FROM_NAME);
      setFromEmail(data.emailFromAddress ?? DEFAULT_FROM_EMAIL);
      setSubject(data.emailSubject ?? DEFAULT_SUBJECT);
      setBodyHtml(data.emailBodyHtml ?? "");
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSave() {
    setSaving(true);
    try {
      await fetchApi("/api/settings/admin", {
        method: "PUT",
        body: JSON.stringify({
          emailFromName: fromName,
          emailFromAddress: fromEmail,
          emailSubject: subject,
          emailBodyHtml: bodyHtml || null,
        }),
      });
      toast({ title: "Email template saved", description: "Changes will apply to all new ticket purchases." });
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleTestEmail() {
    setTesting(true);
    try {
      const result = await fetchApi<{ sentTo: string }>("/api/settings/admin/test-email", { method: "POST" });
      toast({ title: "Test email sent!", description: `Check your inbox at ${result.sentTo}` });
    } catch (err: any) {
      toast({ title: "Failed to send test email", description: err.message, variant: "destructive" });
    } finally {
      setTesting(false);
    }
  }

  return (
    <Layout>
      <div className="p-8 space-y-8 max-w-2xl">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">App Settings</h1>
          <p className="text-muted-foreground mt-1">Configure global settings for the mobile app.</p>
        </div>

        {/* Hero Video */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Video className="w-5 h-5 text-primary" />
              <CardTitle>Home Screen Hero Video</CardTitle>
            </div>
            <CardDescription>
              The hero video that plays at the top of the mobile home screen is managed from the{" "}
              <Link href="/videos" className="text-primary underline underline-offset-4">Videos tab</Link>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/videos">
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline cursor-pointer">
                Go to Videos →
              </span>
            </Link>
          </CardContent>
        </Card>

        {/* Email Confirmation Template */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" />
              <CardTitle>Ticket Confirmation Email</CardTitle>
            </div>
            <CardDescription>
              Customise the email sent to members when they register for an event. Leave the HTML body blank to use the built-in default template.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading settings…
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="fromName">Sender Name</Label>
                    <Input
                      id="fromName"
                      value={fromName}
                      onChange={(e) => setFromName(e.target.value)}
                      placeholder={DEFAULT_FROM_NAME}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="fromEmail">From Email</Label>
                    <Input
                      id="fromEmail"
                      type="email"
                      value={fromEmail}
                      onChange={(e) => setFromEmail(e.target.value)}
                      placeholder={DEFAULT_FROM_EMAIL}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="subject">Subject Line</Label>
                  <Input
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder={DEFAULT_SUBJECT}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="bodyHtml">HTML Email Body</Label>
                    <span className="text-xs text-muted-foreground">Optional — leave blank for the default template</span>
                  </div>
                  <Textarea
                    id="bodyHtml"
                    value={bodyHtml}
                    onChange={(e) => setBodyHtml(e.target.value)}
                    placeholder={"<!DOCTYPE html>\n<html>…</html>"}
                    className="font-mono text-xs min-h-[220px] resize-y"
                  />
                </div>

                {/* Template variables reference */}
                <div className="rounded-lg border border-dashed p-4 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Available variables</p>
                  <div className="flex flex-wrap gap-2">
                    {TEMPLATE_VARS.map(({ key, desc }) => (
                      <div key={key} className="flex items-center gap-1.5">
                        <Badge variant="outline" className="font-mono text-xs cursor-default">{key}</Badge>
                        <span className="text-xs text-muted-foreground">{desc}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                    Save Template
                  </Button>
                  <Button variant="outline" onClick={handleTestEmail} disabled={testing}>
                    {testing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                    Send Test Email
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
