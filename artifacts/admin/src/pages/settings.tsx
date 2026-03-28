import { useEffect, useState, useCallback, useMemo } from "react";
import QRCode from "qrcode";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Video, Mail, Gift, Send, CheckCircle2, Loader2, Eye, Pencil, Link2, Image as ImageIcon, Type, FileText, Shield } from "lucide-react";
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
  qrCodeDataUrl?: string;
}) {
  const { headerImageUrl, bodyText, ctaText, ctaUrl, qrCodeDataUrl } = opts;

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

  const ticketBlock = qrCodeDataUrl
    ? `<div style="background:#ffffff;border-radius:12px;padding:18px;text-align:center;margin:20px 0;">
        <p style="font-size:10px;text-transform:uppercase;letter-spacing:0.8px;color:#555;margin:0 0 10px;">Your Ticket — Scan at the door</p>
        <img src="${qrCodeDataUrl}" alt="Ticket QR Code" width="180" height="180" style="display:block;margin:0 auto;border-radius:8px;" />
        <p style="font-family:'Courier New',monospace;font-size:13px;font-weight:bold;color:#111;letter-spacing:2px;margin:10px 0 0;">DEMO-0001</p>
      </div>`
    : `<div style="background:#0D0D0D;border:1px dashed #FFD700;border-radius:8px;padding:14px;text-align:center;margin:20px 0;">
        <p style="font-size:11px;color:rgba(255,255,255,0.5);letter-spacing:0.8px;text-transform:uppercase;margin:0 0 5px;">Your Ticket Code</p>
        <p style="font-family:'Courier New',monospace;font-size:20px;font-weight:bold;color:#FFD700;letter-spacing:3px;margin:0;">DEMO-0001</p>
      </div>`;

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
      ${ticketBlock}
      ${ctaBlock}
      <p style="font-size:12px;color:rgba(255,255,255,0.35);text-align:center;margin:18px 0 0;">Show this at the door. See you on the court!</p>
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

  // Preview QR code (shared — same demo code for both previews)
  const [previewQrDataUrl, setPreviewQrDataUrl] = useState<string>("");
  useEffect(() => {
    QRCode.toDataURL("DEMO-0001", { errorCorrectionLevel: "M", margin: 2, width: 200, color: { dark: "#111111", light: "#ffffff" } })
      .then(setPreviewQrDataUrl)
      .catch(() => {});
  }, []);

  // Legal content
  const [privacyPolicy, setPrivacyPolicy] = useState("");
  const [termsOfService, setTermsOfService] = useState("");
  const [legalSaving, setLegalSaving] = useState(false);

  // Gift email
  const [giftSaving, setGiftSaving] = useState(false);
  const [giftActiveTab, setGiftActiveTab] = useState<"edit" | "preview">("edit");
  const [giftSubject, setGiftSubject] = useState(DEFAULT_GIFT_SUBJECT);
  const [giftHeaderImageUrl, setGiftHeaderImageUrl] = useState("");
  const [giftBodyText, setGiftBodyText] = useState(DEFAULT_GIFT_BODY);
  const [giftCtaText, setGiftCtaText] = useState("");
  const [giftCtaUrl, setGiftCtaUrl] = useState("");

  const previewHtml = useMemo(
    () => buildPreviewHtml({ headerImageUrl: resolveImageUrl(headerImageUrl), bodyText, ctaText, ctaUrl, qrCodeDataUrl: previewQrDataUrl }),
    [headerImageUrl, bodyText, ctaText, ctaUrl, previewQrDataUrl]
  );

  const giftPreviewHtml = useMemo(
    () => buildPreviewHtml({ headerImageUrl: resolveImageUrl(giftHeaderImageUrl), bodyText: giftBodyText, ctaText: giftCtaText, ctaUrl: giftCtaUrl, qrCodeDataUrl: previewQrDataUrl }),
    [giftHeaderImageUrl, giftBodyText, giftCtaText, giftCtaUrl, previewQrDataUrl]
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
      setPrivacyPolicy(data.privacyPolicy ?? "");
      setTermsOfService(data.termsOfService ?? "");
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
        }),
      });
      toast({ title: "Sender settings saved" });
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleLegalSave() {
    setLegalSaving(true);
    try {
      await fetchApi("/api/settings/admin", {
        method: "PUT",
        body: JSON.stringify({
          privacyPolicy: privacyPolicy || null,
          termsOfService: termsOfService || null,
        }),
      });
      toast({ title: "Legal content saved", description: "Members will see the updated content in-app." });
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setLegalSaving(false);
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

      {/* Legal Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <CardTitle>Legal Content</CardTitle>
          </div>
          <CardDescription>
            Manage your Privacy Policy and Terms of Service. This content is displayed in-app when members tap the links on the profile and registration screens — no external website required.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm py-6">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-sm font-semibold">
                  <Shield className="w-4 h-4 text-muted-foreground" />
                  Privacy Policy
                </Label>
                <Textarea
                  value={privacyPolicy}
                  onChange={(e) => setPrivacyPolicy(e.target.value)}
                  placeholder="Enter your full Privacy Policy text here. This will be shown to members in-app when they tap 'Privacy Policy'."
                  rows={10}
                  className="bg-background border-border rounded-xl text-sm font-mono resize-y"
                />
                <p className="text-xs text-muted-foreground">Plain text. Line breaks are preserved. Leave blank to show a fallback message.</p>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-sm font-semibold">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  Terms of Service
                </Label>
                <Textarea
                  value={termsOfService}
                  onChange={(e) => setTermsOfService(e.target.value)}
                  placeholder="Enter your full Terms of Service text here. This will be shown to members in-app when they tap 'Terms of Service'."
                  rows={10}
                  className="bg-background border-border rounded-xl text-sm font-mono resize-y"
                />
                <p className="text-xs text-muted-foreground">Plain text. Line breaks are preserved. Leave blank to show a fallback message.</p>
              </div>
              <Button onClick={handleLegalSave} disabled={legalSaving} className="rounded-xl bg-primary hover:bg-primary/90 text-white gap-2">
                {legalSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><CheckCircle2 className="w-4 h-4" /> Save Legal Content</>}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email Config Notice */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            <CardTitle>Email Templates</CardTitle>
          </div>
          <CardDescription>
            Email templates (ticket confirmation &amp; gift ticket) are now configured per-event. Open the <Link href="/events" className="text-primary underline underline-offset-4">Events</Link> page and click the <span className="inline-flex items-center gap-1 font-medium text-foreground">✉ email icon</span> on any event to customise its templates. Global defaults can be set below using the Sender settings.
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
              <Button onClick={handleSave} disabled={saving} className="rounded-xl bg-primary hover:bg-primary/90 text-white">
                {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</> : "Save Sender Settings"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
