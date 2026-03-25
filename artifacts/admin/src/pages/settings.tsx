import { useState, useEffect, useRef } from "react";
import { Layout } from "@/components/layout";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save, Video, Upload, X, Link } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

async function requestUploadUrl(file: File): Promise<{ uploadURL: string; objectPath: string }> {
  const res = await fetch("/api/storage/uploads/request-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type || "video/mp4" }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to get upload URL");
  }
  return res.json();
}

async function uploadToGcs(file: File, uploadURL: string): Promise<void> {
  const res = await fetch(uploadURL, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type || "video/mp4" },
  });
  if (!res.ok) throw new Error("Upload to storage failed");
}

export default function SettingsPage() {
  const { data: settings, isLoading } = useSettings();
  const { mutate: updateSettings, isPending } = useUpdateSettings();
  const { toast } = useToast();

  const [homeVideoUrl, setHomeVideoUrl] = useState("");
  const [mode, setMode] = useState<"upload" | "url">("upload");
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (settings) {
      setHomeVideoUrl(settings.homeVideoUrl ?? "");
    }
  }, [settings]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);
    setProgress(10);

    try {
      const { uploadURL, objectPath } = await requestUploadUrl(file);
      setProgress(40);
      await uploadToGcs(file, uploadURL);
      setProgress(90);
      const serveUrl = `/api/storage${objectPath}`;
      setHomeVideoUrl(serveUrl);
      setProgress(100);
      toast({ title: "Video uploaded", description: "Click Save Settings to apply." });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleClear() {
    setHomeVideoUrl("");
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleSave() {
    updateSettings(
      { homeVideoUrl: homeVideoUrl.trim() || null },
      {
        onSuccess: () =>
          toast({ title: "Settings saved", description: "Home video updated." }),
        onError: () =>
          toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" }),
      }
    );
  }

  const hasVideo = !!homeVideoUrl;

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
                Upload an MP4 video or paste a direct URL. It will auto-play (muted &amp; looped) at
                the top of the mobile home screen. Members can tap to unmute.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">

              {hasVideo ? (
                <div className="space-y-3">
                  <Label>Current Video</Label>
                  <div className="relative rounded-xl border border-border/50 bg-black overflow-hidden">
                    <video
                      src={homeVideoUrl}
                      className="w-full h-40 object-cover"
                      muted
                      playsInline
                      controls={false}
                    />
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center gap-3 opacity-0 hover:opacity-100 transition-opacity">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="bg-background/80"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                      >
                        <Upload className="w-3.5 h-3.5 mr-1.5" /> Replace
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="bg-background/80 text-destructive border-destructive/50"
                        onClick={handleClear}
                      >
                        <X className="w-3.5 h-3.5 mr-1.5" /> Remove
                      </Button>
                    </div>
                    {isUploading && (
                      <div
                        className="absolute bottom-0 left-0 h-1 bg-primary transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground break-all">{homeVideoUrl}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex rounded-xl border border-border/50 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setMode("upload")}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors border-r border-border/50",
                        mode === "upload" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Upload className="w-3.5 h-3.5" /> Upload File
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode("url")}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors",
                        mode === "url" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Link className="w-3.5 h-3.5" /> Paste URL
                    </button>
                  </div>

                  {mode === "upload" ? (
                    <div>
                      <div
                        onClick={() => !isUploading && fileInputRef.current?.click()}
                        className={cn(
                          "border-2 border-dashed border-border/50 rounded-xl p-10 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors",
                          isUploading && "pointer-events-none opacity-70"
                        )}
                      >
                        {isUploading ? (
                          <>
                            <Loader2 className="w-8 h-8 mx-auto mb-2 text-primary animate-spin" />
                            <p className="text-sm text-muted-foreground">Uploading… {progress}%</p>
                            <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden w-48 mx-auto">
                              <div
                                className="h-full bg-primary rounded-full transition-all duration-300"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </>
                        ) : (
                          <>
                            <Video className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                            <p className="text-sm font-medium">Click to upload a video</p>
                            <p className="text-xs text-muted-foreground mt-1">MP4, MOV, or WebM</p>
                          </>
                        )}
                      </div>
                      {uploadError && (
                        <p className="text-xs text-destructive mt-1">{uploadError}</p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Input
                        type="url"
                        placeholder="https://example.com/promo.mp4"
                        value={homeVideoUrl}
                        onChange={(e) => setHomeVideoUrl(e.target.value)}
                        className="bg-background border-border/50 rounded-xl"
                      />
                      <p className="text-xs text-muted-foreground">
                        Must be a direct link to an MP4 file. YouTube / Vimeo links won't work inline.
                      </p>
                    </div>
                  )}
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/mov,video/quicktime,video/webm,video/*"
                className="hidden"
                onChange={handleFileChange}
              />

              <Button onClick={handleSave} disabled={isPending || isUploading} className="w-full sm:w-auto">
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
