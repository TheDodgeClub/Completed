import { useEffect, useState, useCallback, useMemo } from "react";
import QRCode from "qrcode";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Video, Mail, FileText, Shield, CheckCircle2, Loader2, Settings2, Globe } from "lucide-react";
import { Link } from "wouter";
import { fetchApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const DEFAULT_FROM_NAME = "The Dodge Club";
const DEFAULT_FROM_EMAIL = "info@thedodgeclub.co.uk";

/* ─── Email preview helpers (kept for future per-global-template use) ─── */
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

  const bodyLines = bodyText
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

export default function SettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [fromName, setFromName] = useState(DEFAULT_FROM_NAME);
  const [fromEmail, setFromEmail] = useState(DEFAULT_FROM_EMAIL);

  const [communityGuidelines, setCommunityGuidelines] = useState("");
  const [privacyPolicy, setPrivacyPolicy] = useState("");
  const [termsOfService, setTermsOfService] = useState("");
  const [legalSaving, setLegalSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchApi<Record<string, string>>("/api/settings/admin");
      setFromName(data.emailFromName ?? DEFAULT_FROM_NAME);
      setFromEmail(data.emailFromAddress ?? DEFAULT_FROM_EMAIL);
      setCommunityGuidelines(data.communityGuidelines ?? "");
      setPrivacyPolicy(data.privacyPolicy ?? "");
      setTermsOfService(data.termsOfService ?? "");
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
          communityGuidelines: communityGuidelines || null,
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

  return (
    <div className="p-8 max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Configure global settings for the Dodge Club app and admin dashboard.</p>
      </div>

      <Tabs defaultValue="general">
        <TabsList className="mb-6">
          <TabsTrigger value="general" className="gap-2">
            <Settings2 className="w-4 h-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="email" className="gap-2">
            <Mail className="w-4 h-4" />
            Email
          </TabsTrigger>
          <TabsTrigger value="legal" className="gap-2">
            <Shield className="w-4 h-4" />
            Legal
          </TabsTrigger>
        </TabsList>

        {/* ── General ── */}
        <TabsContent value="general" className="space-y-6">
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

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary" />
                <CardTitle>App Domain</CardTitle>
              </div>
              <CardDescription>
                The public-facing domain for The Dodge Club app and website.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30 border border-border/50">
                <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-mono text-foreground">thedodgeclub.co.uk</span>
                <span className="ml-auto text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">Live</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Email ── */}
        <TabsContent value="email" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-primary" />
                <CardTitle>Sender Settings</CardTitle>
              </div>
              <CardDescription>
                The name and email address that appears in the "from" field for all automated emails (ticket confirmations, gift tickets, warnings, etc.).
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm py-6">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading…
                </div>
              ) : (
                <div className="space-y-5">
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
                  <Button onClick={handleSave} disabled={saving} className="rounded-xl bg-primary hover:bg-primary/90 text-white gap-2">
                    {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><CheckCircle2 className="w-4 h-4" /> Save Sender Settings</>}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <CardTitle>Email Templates</CardTitle>
              </div>
              <CardDescription>
                Ticket confirmation and gift ticket email templates are customised per event. Open any event and click the{" "}
                <span className="inline-flex items-center gap-1 font-medium text-foreground">✉ email icon</span> to edit its templates.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/events">
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline cursor-pointer">
                  Go to Events →
                </span>
              </Link>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Legal ── */}
        <TabsContent value="legal" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <CardTitle>Community Guidelines</CardTitle>
              </div>
              <CardDescription>
                Shown in-app when members tap "Community Guidelines" on their profile. Leave blank to display a friendly placeholder message.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm py-6">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading…
                </div>
              ) : (
                <div className="space-y-3">
                  <Textarea
                    value={communityGuidelines}
                    onChange={(e) => setCommunityGuidelines(e.target.value)}
                    placeholder="Enter your Community Guidelines here. Plain text — line breaks are preserved."
                    rows={14}
                    className="bg-background border-border rounded-xl text-sm font-mono resize-y"
                  />
                  <p className="text-xs text-muted-foreground">Plain text only. Line breaks are preserved when displayed in-app.</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                <CardTitle>Privacy Policy</CardTitle>
              </div>
              <CardDescription>
                Shown in-app when members tap "Privacy Policy" on the profile or registration screen. Leave blank to display a fallback message pointing to thedodgeclub.co.uk.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm py-6">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading…
                </div>
              ) : (
                <div className="space-y-3">
                  <Textarea
                    value={privacyPolicy}
                    onChange={(e) => setPrivacyPolicy(e.target.value)}
                    placeholder="Enter your full Privacy Policy here. Plain text — line breaks are preserved."
                    rows={14}
                    className="bg-background border-border rounded-xl text-sm font-mono resize-y"
                  />
                  <p className="text-xs text-muted-foreground">Plain text only. Line breaks are preserved when displayed in-app.</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <CardTitle>Terms of Service</CardTitle>
              </div>
              <CardDescription>
                Shown in-app when members tap "Terms of Service" on the profile or registration screen. Leave blank to display a fallback message.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm py-6">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading…
                </div>
              ) : (
                <div className="space-y-3">
                  <Textarea
                    value={termsOfService}
                    onChange={(e) => setTermsOfService(e.target.value)}
                    placeholder="Enter your full Terms of Service here. Plain text — line breaks are preserved."
                    rows={14}
                    className="bg-background border-border rounded-xl text-sm font-mono resize-y"
                  />
                  <p className="text-xs text-muted-foreground">Plain text only. Line breaks are preserved when displayed in-app.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {!loading && (
            <div className="flex justify-end">
              <Button onClick={handleLegalSave} disabled={legalSaving} className="rounded-xl bg-primary hover:bg-primary/90 text-white gap-2">
                {legalSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><CheckCircle2 className="w-4 h-4" /> Save Legal Content</>}
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
