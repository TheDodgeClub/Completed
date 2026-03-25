import { useState, useEffect } from "react";
import { Layout } from "@/components/layout";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save, Video, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const { data: settings, isLoading } = useSettings();
  const { mutate: updateSettings, isPending } = useUpdateSettings();
  const { toast } = useToast();

  const [homeVideoUrl, setHomeVideoUrl] = useState("");

  useEffect(() => {
    if (settings) {
      setHomeVideoUrl(settings.homeVideoUrl ?? "");
    }
  }, [settings]);

  function handleSave() {
    updateSettings(
      { homeVideoUrl: homeVideoUrl.trim() || null },
      {
        onSuccess: () =>
          toast({ title: "Settings saved", description: "Home video URL updated." }),
        onError: () =>
          toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" }),
      }
    );
  }

  return (
    <Layout>
      <div className="p-8 space-y-8 max-w-2xl">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">App Settings</h1>
          <p className="text-muted-foreground mt-1">Configure global settings for the mobile app.</p>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading settings…
          </div>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Video className="w-5 h-5 text-primary" />
                <CardTitle>Home Screen Hero Video</CardTitle>
              </div>
              <CardDescription>
                Paste a direct link to an MP4 video file. It will auto-play (muted &amp; looped) at the
                top of the mobile app home screen. Members can tap to unmute.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="videoUrl">Video URL</Label>
                <Input
                  id="videoUrl"
                  placeholder="https://example.com/promo.mp4"
                  value={homeVideoUrl}
                  onChange={(e) => setHomeVideoUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Must be a direct link to an MP4 file. YouTube / Vimeo links won't work inline.
                  Leave empty to hide the video section.
                </p>
              </div>

              {homeVideoUrl && (
                <a
                  href={homeVideoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-primary underline underline-offset-4"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Preview URL
                </a>
              )}

              <Button onClick={handleSave} disabled={isPending} className="w-full sm:w-auto">
                {isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Settings
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
