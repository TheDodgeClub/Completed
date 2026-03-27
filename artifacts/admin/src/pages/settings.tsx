import { useEffect, useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Video, Mail, Gift, Send, CheckCircle2, Loader2, Eye, Pencil, Link2, Image as ImageIcon, Type } from "lucide-react";
import { Link } from "wouter";
import { fetchApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { ImageUploader } from "@/components/image-uploader";
import { cn } from "@/lib/utils";

const TEMPLATE_VARS = [
  { key: "{{userName}}", desc: "Member's name", label: "Name" },
  { key: "{{eventName}}", desc: "Event title", label: "Event" },
  { key: "{{eventDate}}", desc: "Formatted date", label: "Date" },
  { key: "{{eventLocation}}", desc: "Venue", label: "Location" },
  { key: "{{ticketCode}}", desc: "Unique code", label: "Code" },
];

const GIFT_TEMPLATE_VARS = [
  { key: "{{recipientName}}", desc: "Recipient's name or email", label: "Recipient" },
  { key: "{{gifterName}}", desc: "Name of the person gifting", label: "Gifter" },
  { key: "{{eventName}}", desc: "Event title", label: "Event" },
  { key: "{{eventDate}}", desc: "Formatted date", label: "Date" },
  { key: "{{eventLocation}}", desc: "Venue", label: "Location" },
  { key: "{{ticketCode}}", desc: "Unique code", label: "Code" },
];

const DEFAULT_SUBJECT = "Your ticket is confirmed! 🎉";
const DEFAULT_GIFT_SUBJECT = "You've been gifted a ticket! 🎁";
const DEFAULT_FROM_NAME = "The Dodge Club";
const DEFAULT_FROM_EMAIL = "info@thedodgeclub.co.uk";
const DEFAULT_BODY = `Hey {{userName}},

You're in! Here are your ticket details below. Show your ticket code at the door and we'll see you on the court! 🎯`;
const DEFAULT_GIFT_BODY = `Hey {{recipientName}},

Great news — {{gifterName}} has gifted you a ticket to {{eventName}}! Show your ticket code at the door and we'll see you on the court! 🎯`;

function buildPreviewHtml(opts: {
  headerImageUrl: string;
  bodyText: string;
  ctaText: string;
  ctaUrl: string;
}) {
  const { headerImageUrl, bodyText, ctaText, ctaUrl } = opts;

  const headerImageBlock = headerImageUrl
    ? `<img src="${headerImageUrl}" alt="Event" style="width:100%;display:block;" />`
    : "";

  const bodyLines = (bodyText || DEFAULT_BODY)
    .split("\n")
    .map((l) =>
      l.trim() === ""
        ? `<br/>`
        : `<p style="margin:0 0 12px;color:rgba(255,255,255,0.85);font-size:15px;line-height:1.6;">${l}</p>`
    )
    .join("\n");

  const ctaBlock =
    ctaText && ctaUrl
      ? `<div style="text-align:center;margin:28px 0 8px;">
          <a href="${ctaUrl}" style="display:inline-block;background:#0B5E2F;color:#FFD700;text-decoration:none;font-weight:700;font-size:15px;padding:14px 32px;border-radius:8px;">${ctaText}</a>
        </div>`
      : "";

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:16px;background:#0D0D0D;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:480px;margin:0 auto;background:#151515;border-radius:12px;overflow:hidden;">
    ${headerImageBlock}
    <div style="background:#0B5E2F;padding:24px 28px 18px;text-align:center;">
      <h1 style="margin:0;font-size:22px;color:#FFD700;">The Dodge Club</h1>
      <p style="margin:5px 0 0;color:rgba(255,255,255,0.7);font-size:13px;">Your ticket is confirmed</p>
    </div>
    <div style="padding:28px;">
      ${bodyLines}
      <div style="background:rgba(11,94,47,0.13);border:1px solid #0B5E2F;border-radius:10px;padding:18px 22px;margin:22px 0;">
        <p style="font-size:10px;text-transform:uppercase;letter-spacing:0.8px;color:rgba(255,255,255,0.4);margin:0 0 3px;">Event</p>
        <p style="font-size:14px;color:#fff;font-weight:500;margin:0 0 12px;">April Thrills 🎯</p>
        <p style="font-size:10px;text-transform:uppercase;letter-spacing:0.8px;color:rgba(255,255,255,0.4);margin:0 0 3px;">Date</p>
        <p style="font-size:14px;color:#fff;font-weight:500;margin:0 0 12px;">Saturday, 12 April 2025</p>
        <p style="font-size:10px;text-transform:uppercase;letter-spacing:0.8px;color:rgba(255,255,255,0.4);margin:0 0 3px;">Location</p>
        <p style="font-size:14px;color:#fff;font-weight:500;margin:0;">Dodge Club Arena, London</p>
      </div>
      <div style="background:#0D0D0D;border:1px dashed #FFD700;border-radius:8px;padding:14px;text-align:center;margin:20px 0;">
        <p style="font-size:11px;color:rgba(255,255,255,0.5);letter-spacing:0.8px;text-transform:uppercase;margin:0 0 5px;">Your Ticket Code</p>
        <p style="font-family:'Courier New',monospace;font-size:20px;font-weight:bold;color:#FFD700;letter-spacing:3px;margin:0;">DEMO-0001</p>
      </div>
      ${ctaBlock}
      <p style="font-size:12px;color:rgba(255,255,255,0.35);text-align:center;margin:18px 0 0;">Show this code at the door. See you on the court!</p>
    </div>
    <div style="padding:16px 28px;text-align:center;font-size:11px;color:rgba(255,255,255,0.2);border-top:1px solid #222;">
      The Dodge Club &bull; Automated confirmation email
    </div>
  </div>
</body></html>`;
}

function resolveImageUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith("http")) return url;
  return `${window.location.origin}${url.startsWith("/") ? "" : "/"}${url}`;
}

export default function SettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");

  // Ticket confirmation email
  const [fromName, setFromName] = useState(DEFAULT_FROM_NAME);
  const [fromEmail, setFromEmail] = useState(DEFAULT_FROM_EMAIL);
  const [subject, setSubject] = useState(DEFAULT_SUBJECT);
  const [headerImageUrl, setHeaderImageUrl] = useState("");
  const [bodyText, setBodyText] = useState(DEFAULT_BODY);
  const [ctaText, setCtaText] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [testEmailAddress, setTestEmailAddress] = useState("");

  // Gift email
  const [giftSaving, setGiftSaving] = useState(false);
  const [giftActiveTab, setGiftActiveTab] = useState<"edit" | "preview">("edit");
  const [giftSubject, setGiftSubject] = useState(DEFAULT_GIFT_SUBJECT);
  const [giftHeaderImageUrl, setGiftHeaderImageUrl] = useState("");
  const [giftBodyText, setGiftBodyText] = useState(DEFAULT_GIFT_BODY);
  const [giftCtaText, setGiftCtaText] = useState("");
  const [giftCtaUrl, setGiftCtaUrl] = useState("");

  const previewHtml = useMemo(
    () => buildPreviewHtml({ headerImageUrl: resolveImageUrl(headerImageUrl), bodyText, ctaText, ctaUrl }),
    [headerImageUrl, bodyText, ctaText, ctaUrl]
  );

  const giftPreviewHtml = useMemo(
    () => buildPreviewHtml({ headerImageUrl: resolveImageUrl(giftHeaderImageUrl), bodyText: giftBodyText, ctaText: giftCtaText, ctaUrl: giftCtaUrl }),
    [giftHeaderImageUrl, giftBodyText, giftCtaText, giftCtaUrl]
  );

  const load = useCallback(async () => {
    try {
      const data = await fetchApi<Record<string, string>>("/api/settings/admin");
      setFromName(data.emailFromName ?? DEFAULT_FROM_NAME);
      setFromEmail(data.emailFromAddress ?? DEFAULT_FROM_EMAIL);
      setSubject(data.emailSubject ?? DEFAULT_SUBJECT);
      setHeaderImageUrl(data.emailHeaderImageUrl ?? "");
      setBodyText(data.emailBodyText ?? DEFAULT_BODY);
      setCtaText(data.emailCtaText ?? "");
      setCtaUrl(data.emailCtaUrl ?? "");
      setGiftSubject(data.giftEmailSubject ?? DEFAULT_GIFT_SUBJECT);
      setGiftHeaderImageUrl(data.giftEmailHeaderImageUrl ?? "");
      setGiftBodyText(data.giftEmailBodyText ?? DEFAULT_GIFT_BODY);
      setGiftCtaText(data.giftEmailCtaText ?? "");
      setGiftCtaUrl(data.giftEmailCtaUrl ?? "");
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function insertVar(varKey: string) {
    setBodyText((prev) => prev + (prev.endsWith(" ") || prev === "" ? "" : " ") + varKey + " ");
  }

  function insertGiftVar(varKey: string) {
    setGiftBodyText((prev) => prev + (prev.endsWith(" ") || prev === "" ? "" : " ") + varKey + " ");
  }

  async function handleSave() {
    setSaving(true);
    try {
      await fetchApi("/api/settings/admin", {
        method: "PUT",
        body: JSON.stringify({
          emailFromName: fromName,
          emailFromAddress: fromEmail,
          emailSubject: subject,
          emailHeaderImageUrl: headerImageUrl || null,
          emailBodyText: bodyText || null,
          emailCtaText: ctaText || null,
          emailCtaUrl: ctaUrl || null,
          emailBodyHtml: null,
        }),
      });
      toast({ title: "Email template saved", description: "New look applies to all future ticket purchases." });
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleGiftSave() {
    setGiftSaving(true);
    try {
      await fetchApi("/api/settings/admin", {
        method: "PUT",
        body: JSON.stringify({
          giftEmailSubject: giftSubject || null,
          giftEmailHeaderImageUrl: giftHeaderImageUrl || null,
          giftEmailBodyText: giftBodyText || null,
          giftEmailCtaText: giftCtaText || null,
          giftEmailCtaUrl: giftCtaUrl || null,
        }),
      });
      toast({ title: "Gift email template saved", description: "New look applies to all future gift sends." });
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setGiftSaving(false);
    }
  }

  async function handleTestEmail() {
    setTesting(true);
    try {
      const result = await fetchApi<{ sentTo: string }>("/api/settings/admin/test-email", {
        method: "POST",
        body: JSON.stringify({ email: testEmailAddress.trim() || undefined }),
      });
      toast({ title: "Test email sent!", description: `Delivered to ${result.sentTo}` });
    } catch (err: any) {
      toast({ title: "Failed to send test email", description: err.message, variant: "destructive" });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="p-8 space-y-8 max-w-5xl">
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

      {/* Ticket Confirmation Builder */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            <CardTitle>Ticket Confirmation Email</CardTitle>
          </div>
          <CardDescription>
            Design the email members receive when they buy a ticket. Event details and the buyer's name are filled in automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm py-6">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading settings…
            </div>
          ) : (
            <div className="space-y-6">
              {/* Sender row */}
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

              {/* Subject */}
              <div className="space-y-1.5">
                <Label htmlFor="subject">Subject Line</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder={DEFAULT_SUBJECT}
                />
              </div>

              {/* Edit / Preview tabs */}
              <div className="border border-border/50 rounded-xl overflow-hidden">
                {/* Tab bar */}
                <div className="flex border-b border-border/50 bg-muted/30">
                  <button
                    type="button"
                    onClick={() => setActiveTab("edit")}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors border-r border-border/50",
                      activeTab === "edit" ? "bg-background text-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("preview")}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors",
                      activeTab === "preview" ? "bg-background text-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Eye className="w-3.5 h-3.5" /> Preview
                  </button>
                </div>

                {activeTab === "edit" ? (
                  <div className="p-5 space-y-6">
                    {/* Header image */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <ImageIcon className="w-3.5 h-3.5 text-muted-foreground" />
                        <Label>Header Banner Image</Label>
                        <span className="text-xs text-muted-foreground">(optional)</span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        Appears at the top of the email — great for event artwork or club branding.
                      </p>
                      <ImageUploader
                        value={headerImageUrl}
                        onChange={setHeaderImageUrl}
                        label="Banner"
                      />
                    </div>

                    {/* Body message */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5">
                        <Type className="w-3.5 h-3.5 text-muted-foreground" />
                        <Label>Message</Label>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Write your personalised message. The event details and unique ticket code are added automatically below this.
                      </p>
                      {/* Variable chip row */}
                      <div className="flex flex-wrap gap-1.5 py-1">
                        <span className="text-xs text-muted-foreground self-center mr-0.5">Insert:</span>
                        {TEMPLATE_VARS.map(({ key, label, desc }) => (
                          <button
                            key={key}
                            type="button"
                            title={desc}
                            onClick={() => insertVar(key)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-primary text-xs font-medium hover:bg-primary/20 transition-colors cursor-pointer"
                          >
                            + {label}
                          </button>
                        ))}
                      </div>
                      <Textarea
                        value={bodyText}
                        onChange={(e) => setBodyText(e.target.value)}
                        placeholder={DEFAULT_BODY}
                        className="min-h-[140px] resize-y text-sm"
                      />
                    </div>

                    {/* CTA button */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5">
                        <Link2 className="w-3.5 h-3.5 text-muted-foreground" />
                        <Label>Button / Link</Label>
                        <span className="text-xs text-muted-foreground">(optional)</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Add a call-to-action button — link to your website, social page, or event info.
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="ctaText" className="text-xs text-muted-foreground">Button label</Label>
                          <Input
                            id="ctaText"
                            value={ctaText}
                            onChange={(e) => setCtaText(e.target.value)}
                            placeholder="e.g. Visit our website"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="ctaUrl" className="text-xs text-muted-foreground">URL (paste link here)</Label>
                          <Input
                            id="ctaUrl"
                            type="url"
                            value={ctaUrl}
                            onChange={(e) => setCtaUrl(e.target.value)}
                            placeholder="https://thedodgeclub.co.uk"
                          />
                        </div>
                      </div>
                      {ctaText && ctaUrl && (
                        <div className="flex items-center gap-2 text-xs text-primary bg-primary/10 border border-primary/20 rounded-lg px-3 py-2">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          Button set: "{ctaText}" → {ctaUrl}
                        </div>
                      )}
                    </div>

                    {/* Auto-filled info box */}
                    <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-4 space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Auto-filled for every ticket</p>
                      <p className="text-xs text-muted-foreground">
                        The event name, date, location, the buyer's name, and a unique ticket code are always added automatically — you don't need to include them in your message.
                      </p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {TEMPLATE_VARS.map(({ key, desc }) => (
                          <div key={key} className="flex items-center gap-1.5">
                            <Badge variant="outline" className="font-mono text-xs">{key}</Badge>
                            <span className="text-xs text-muted-foreground">{desc}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#0D0D0D] p-4">
                    <p className="text-xs text-center text-muted-foreground mb-3">Live preview — showing example event data</p>
                    <iframe
                      srcDoc={previewHtml}
                      className="w-full rounded-lg border border-border/30"
                      style={{ height: 700, background: "#0D0D0D" }}
                      title="Email preview"
                      sandbox="allow-same-origin"
                    />
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="space-y-3 pt-1">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                  Save Template
                </Button>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1 max-w-xs">
                    <Input
                      type="email"
                      placeholder="Send test to… (leave blank for your inbox)"
                      value={testEmailAddress}
                      onChange={(e) => setTestEmailAddress(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !testing && handleTestEmail()}
                      className="pr-10 text-sm"
                    />
                  </div>
                  <Button variant="outline" onClick={handleTestEmail} disabled={testing}>
                    {testing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                    Send Test
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gift Email Builder */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" />
            <CardTitle>Gift Ticket Email</CardTitle>
          </div>
          <CardDescription>
            Design the email sent to the recipient when someone gifts them a ticket. The gifter's name, recipient's name, event details, and ticket code are filled in automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm py-6">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading settings…
            </div>
          ) : (
            <div className="space-y-6">
              {/* Subject */}
              <div className="space-y-1.5">
                <Label htmlFor="giftSubject">Subject Line</Label>
                <Input
                  id="giftSubject"
                  value={giftSubject}
                  onChange={(e) => setGiftSubject(e.target.value)}
                  placeholder={DEFAULT_GIFT_SUBJECT}
                />
              </div>

              {/* Edit / Preview tabs */}
              <div className="border border-border/50 rounded-xl overflow-hidden">
                <div className="flex border-b border-border/50 bg-muted/30">
                  <button
                    type="button"
                    onClick={() => setGiftActiveTab("edit")}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors border-r border-border/50",
                      giftActiveTab === "edit" ? "bg-background text-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setGiftActiveTab("preview")}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors",
                      giftActiveTab === "preview" ? "bg-background text-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Eye className="w-3.5 h-3.5" /> Preview
                  </button>
                </div>

                {giftActiveTab === "edit" ? (
                  <div className="p-5 space-y-6">
                    {/* Header image */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <ImageIcon className="w-3.5 h-3.5 text-muted-foreground" />
                        <Label>Header Banner Image</Label>
                        <span className="text-xs text-muted-foreground">(optional)</span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        Appears at the top of the gift email — great for a warm, branded feel.
                      </p>
                      <ImageUploader
                        value={giftHeaderImageUrl}
                        onChange={setGiftHeaderImageUrl}
                        label="Banner"
                      />
                    </div>

                    {/* Body message */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5">
                        <Type className="w-3.5 h-3.5 text-muted-foreground" />
                        <Label>Message</Label>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Write the gift message. The event details and ticket code are added automatically below.
                      </p>
                      <div className="flex flex-wrap gap-1.5 py-1">
                        <span className="text-xs text-muted-foreground self-center mr-0.5">Insert:</span>
                        {GIFT_TEMPLATE_VARS.map(({ key, label, desc }) => (
                          <button
                            key={key}
                            type="button"
                            title={desc}
                            onClick={() => insertGiftVar(key)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-primary text-xs font-medium hover:bg-primary/20 transition-colors cursor-pointer"
                          >
                            + {label}
                          </button>
                        ))}
                      </div>
                      <Textarea
                        value={giftBodyText}
                        onChange={(e) => setGiftBodyText(e.target.value)}
                        placeholder={DEFAULT_GIFT_BODY}
                        className="min-h-[140px] resize-y text-sm"
                      />
                    </div>

                    {/* CTA button */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5">
                        <Link2 className="w-3.5 h-3.5 text-muted-foreground" />
                        <Label>Button / Link</Label>
                        <span className="text-xs text-muted-foreground">(optional)</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="giftCtaText" className="text-xs text-muted-foreground">Button label</Label>
                          <Input
                            id="giftCtaText"
                            value={giftCtaText}
                            onChange={(e) => setGiftCtaText(e.target.value)}
                            placeholder="e.g. Visit our website"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="giftCtaUrl" className="text-xs text-muted-foreground">URL (paste link here)</Label>
                          <Input
                            id="giftCtaUrl"
                            type="url"
                            value={giftCtaUrl}
                            onChange={(e) => setGiftCtaUrl(e.target.value)}
                            placeholder="https://thedodgeclub.co.uk"
                          />
                        </div>
                      </div>
                      {giftCtaText && giftCtaUrl && (
                        <div className="flex items-center gap-2 text-xs text-primary bg-primary/10 border border-primary/20 rounded-lg px-3 py-2">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          Button set: "{giftCtaText}" → {giftCtaUrl}
                        </div>
                      )}
                    </div>

                    {/* Auto-filled info box */}
                    <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-4 space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Auto-filled for every gift</p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {GIFT_TEMPLATE_VARS.map(({ key, desc }) => (
                          <div key={key} className="flex items-center gap-1.5">
                            <Badge variant="outline" className="font-mono text-xs">{key}</Badge>
                            <span className="text-xs text-muted-foreground">{desc}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#0D0D0D] p-4">
                    <p className="text-xs text-center text-muted-foreground mb-3">Live preview — showing example gift data</p>
                    <iframe
                      srcDoc={giftPreviewHtml}
                      className="w-full rounded-lg border border-border/30"
                      style={{ height: 700, background: "#0D0D0D" }}
                      title="Gift email preview"
                      sandbox="allow-same-origin"
                    />
                  </div>
                )}
              </div>

              {/* Save button */}
              <div className="pt-1">
                <Button onClick={handleGiftSave} disabled={giftSaving}>
                  {giftSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                  Save Gift Email Template
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
