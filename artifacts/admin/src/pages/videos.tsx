import { useState, useRef, useEffect } from "react";
import { useVideos, useCreateVideo, useUpdateVideo, useDeleteVideo, usePublishVideo, Video, VideoInput } from "@/hooks/use-videos";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit2, Trash2, Globe, EyeOff, Video as VideoIcon, ExternalLink, Upload, X, Link, Save, Loader2, Camera, Image as ImageIcon, Star } from "lucide-react";
import { ImageUploader } from "@/components/image-uploader";
import { useForm } from "react-hook-form";
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

function HeroImageSection() {
  const { data: settings, isLoading } = useSettings();
  const { mutate: updateSettings, isPending } = useUpdateSettings();
  const { toast } = useToast();

  const [heroImageUrl, setHeroImageUrl] = useState("");

  useEffect(() => {
    if (settings) setHeroImageUrl(settings.homeHeroImageUrl ?? "");
  }, [settings]);

  function handleSave() {
    updateSettings(
      { homeHeroImageUrl: heroImageUrl.trim() || null },
      {
        onSuccess: () => toast({ title: "Saved", description: "Home screen hero image updated." }),
        onError: () => toast({ title: "Error", description: "Failed to save.", variant: "destructive" }),
      }
    );
  }

  if (isLoading) return null;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-primary" />
          <CardTitle className="text-base">Home Screen Hero Image</CardTitle>
        </div>
        <CardDescription>
          Upload a background image for the hero section at the top of the mobile app home screen. When set, this replaces the default green gradient. Leave blank to use the gradient.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ImageUploader
          value={heroImageUrl || undefined}
          onChange={(url) => setHeroImageUrl(url)}
          label="Hero Background Image"
        />
        <Button onClick={handleSave} disabled={isPending} size="sm" className="w-full sm:w-auto">
          {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
          Save Hero Image
        </Button>
      </CardContent>
    </Card>
  );
}

function FeaturedVideoSection({ videos }: { videos: Video[] }) {
  const { data: settings, isLoading } = useSettings();
  const { mutate: updateSettings, isPending } = useUpdateSettings();
  const { toast } = useToast();

  const publishedVideos = videos.filter(v => v.isPublished);

  const [enabled, setEnabled] = useState(false);
  const [selectedId, setSelectedId] = useState<string>("");

  useEffect(() => {
    if (settings) {
      setEnabled(settings.homeFeaturedVideoEnabled === "true");
      setSelectedId(settings.homeFeaturedVideoId ?? "");
    }
  }, [settings]);

  function handleSave() {
    updateSettings(
      {
        homeFeaturedVideoEnabled: enabled ? "true" : "false",
        homeFeaturedVideoId: selectedId || null,
      },
      {
        onSuccess: () => toast({ title: "Saved", description: "Featured video settings updated." }),
        onError: () => toast({ title: "Error", description: "Failed to save.", variant: "destructive" }),
      }
    );
  }

  if (isLoading) return null;

  const selectedVideo = publishedVideos.find(v => String(v.id) === selectedId);

  return (
    <div className="space-y-4">
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-primary" />
            <CardTitle className="text-base">Featured Video in Latest Updates</CardTitle>
          </div>
          <CardDescription>
            When enabled, a featured video card appears at the top of the "Latest Updates" section on the home screen. Only published videos can be featured.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch
              checked={enabled}
              onCheckedChange={setEnabled}
              id="featured-toggle"
            />
            <Label htmlFor="featured-toggle" className="cursor-pointer">
              {enabled ? "Featured video is visible on home screen" : "Featured video is hidden"}
            </Label>
          </div>

          {enabled && (
            <div className="space-y-3">
              {publishedVideos.length === 0 ? (
                <div className="rounded-xl border border-border/50 p-6 text-center text-muted-foreground">
                  <VideoIcon className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-medium">No published videos</p>
                  <p className="text-xs mt-1">Publish a video in the "Updates Videos" tab first.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Select a video to feature</Label>
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {publishedVideos.map(video => (
                      <button
                        key={video.id}
                        type="button"
                        onClick={() => setSelectedId(String(video.id))}
                        className={cn(
                          "w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-colors",
                          String(video.id) === selectedId
                            ? "border-primary bg-primary/10"
                            : "border-border/50 hover:border-border hover:bg-secondary/30"
                        )}
                      >
                        {video.thumbnailUrl ? (
                          <img src={video.thumbnailUrl} alt={video.title}
                            className="w-14 h-10 object-cover rounded-lg border border-border/50 shrink-0"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                        ) : (
                          <div className="w-14 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                            <VideoIcon className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className={cn("text-sm font-semibold truncate", String(video.id) === selectedId ? "text-primary" : "text-foreground")}>
                            {video.title}
                          </p>
                          {video.description && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{video.description}</p>
                          )}
                        </div>
                        {String(video.id) === selectedId && (
                          <div className="shrink-0 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                            <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 12 12">
                              <path d="M10 3L5 8.5 2 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                            </svg>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {selectedVideo && (
                <div className="rounded-xl border border-border/50 bg-secondary/30 p-3">
                  <p className="text-xs text-muted-foreground mb-1">Currently selected</p>
                  <p className="text-sm font-semibold">{selectedVideo.title}</p>
                </div>
              )}
            </div>
          )}

          <Button onClick={handleSave} disabled={isPending || (enabled && !selectedId)} size="sm" className="w-full sm:w-auto">
            {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
            Save Featured Video
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Videos() {
  const { data: videos, isLoading } = useVideos();
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"image" | "updates" | "featured">("image");

  const { mutate: publish } = usePublishVideo();
  const { toast } = useToast();

  const handlePublish = (video: Video) => {
    const next = !video.isPublished;
    publish({ id: video.id, publish: next }, {
      onSuccess: () => toast({ title: next ? "Video published to mobile app" : "Video unpublished" }),
      onError: () => toast({ title: "Error toggling publish state", variant: "destructive" }),
    });
  };

  if (isLoading) return <div className="p-8 text-muted-foreground animate-pulse">Loading videos...</div>;

  const allVideos = videos ?? [];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Media</h1>
          <p className="text-muted-foreground mt-1">Manage media content for the mobile app.</p>
        </div>
        {activeTab === "updates" && (
          <Button onClick={() => setIsCreateOpen(true)} className="bg-primary hover:bg-primary/90 text-white rounded-xl shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4 mr-2" /> Add Video
          </Button>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex rounded-xl border border-border/50 overflow-hidden bg-secondary/30 p-1 gap-1">
        {(["image", "updates", "featured"] as const).map((tab) => {
          const labels: Record<typeof tab, string> = { image: "Hero Image", updates: "Updates Videos", featured: "Featured in Updates" };
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-colors",
                activeTab === tab
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {labels[tab]}
            </button>
          );
        })}
      </div>

      {/* Hero Image tab */}
      {activeTab === "image" && <HeroImageSection />}

      {/* Updates Videos tab */}
      {activeTab === "updates" && (
        <div>
          <p className="text-sm text-muted-foreground mb-4">Published videos appear in the mobile app's Updates section.</p>
          <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-lg shadow-black/10">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-secondary/50 border-b border-border/50">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-muted-foreground py-4 px-4">Published</TableHead>
                    <TableHead className="text-muted-foreground py-4">Title</TableHead>
                    <TableHead className="text-muted-foreground py-4">URL</TableHead>
                    <TableHead className="text-muted-foreground py-4">Thumbnail</TableHead>
                    <TableHead className="text-muted-foreground py-4 px-6 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allVideos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-40 text-center text-muted-foreground">
                        <VideoIcon className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                        <p className="font-medium">No videos yet</p>
                        <p className="text-sm">Add your first video to share with members.</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    allVideos.map((video) => (
                      <TableRow key={video.id} className="group border-border/50 hover:bg-white/[0.02] transition-colors">
                        <TableCell className="px-4 py-4">
                          <Button
                            variant="ghost" size="sm"
                            onClick={() => handlePublish(video)}
                            className={`h-7 px-2.5 rounded-lg text-xs font-semibold gap-1.5 ${video.isPublished
                              ? "text-emerald-400 bg-emerald-400/10 hover:bg-emerald-400/20"
                              : "text-muted-foreground bg-secondary hover:bg-secondary/80"
                            }`}
                          >
                            {video.isPublished ? <Globe className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                            {video.isPublished ? "Live" : "Draft"}
                          </Button>
                        </TableCell>
                        <TableCell className="py-4">
                          <div>
                            <div className="font-semibold text-foreground group-hover:text-primary transition-colors">{video.title}</div>
                            {video.description && (
                              <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{video.description}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <a href={video.url} target="_blank" rel="noreferrer"
                            className="flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 transition-colors max-w-[200px]">
                            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                            <span className="line-clamp-1">{video.url}</span>
                          </a>
                        </TableCell>
                        <TableCell className="py-4">
                          {video.thumbnailUrl ? (
                            <img src={video.thumbnailUrl} alt={video.title}
                              className="w-16 h-10 object-cover rounded-lg border border-border/50"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                          ) : (
                            <div className="w-16 h-10 rounded-lg bg-secondary flex items-center justify-center">
                              <VideoIcon className="w-4 h-4 text-muted-foreground" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary"
                              onClick={() => setEditingVideo(video)}>
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => setDeleteId(video.id)}>
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
        </div>
      )}

      {/* Featured in Updates tab */}
      {activeTab === "featured" && <FeaturedVideoSection videos={allVideos} />}

      {isCreateOpen && <VideoFormModal onClose={() => setIsCreateOpen(false)} />}
      {editingVideo && <VideoFormModal video={editingVideo} onClose={() => setEditingVideo(null)} />}
      <DeleteVideoDialog id={deleteId} onClose={() => setDeleteId(null)} />
    </div>
  );
}

/* ─── Thumbnail Picker ─── */
async function uploadImageFile(file: File): Promise<string> {
  const res = await fetch("/api/storage/uploads/request-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type || "image/jpeg" }),
  });
  if (!res.ok) throw new Error("Failed to get upload URL");
  const { uploadURL, objectPath } = await res.json();
  const putRes = await fetch(uploadURL, { method: "PUT", body: file, headers: { "Content-Type": file.type || "image/jpeg" } });
  if (!putRes.ok) throw new Error("Upload failed");
  return `/api/storage${objectPath}`;
}

function ThumbnailPicker({ value, onChange, videoUrl }: {
  value: string;
  onChange: (url: string) => void;
  videoUrl: string;
}) {
  const [mode, setMode] = useState<"upload" | "capture" | "url">("upload");
  const [busy, setBusy] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canCapture = !!(videoUrl && !videoUrl.includes("youtube.com") && !videoUrl.includes("youtu.be") && !videoUrl.includes("vimeo.com"));

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setUploadError(null);
    try {
      const url = await uploadImageFile(file);
      onChange(url);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleCapture() {
    if (!videoUrl) return;
    setBusy(true);
    setCaptureError(null);
    try {
      await new Promise<void>((resolve, reject) => {
        const video = document.createElement("video");
        video.crossOrigin = "anonymous";
        video.src = videoUrl;
        video.preload = "auto";
        video.muted = true;

        video.addEventListener("loadedmetadata", () => {
          video.currentTime = Math.min(2, video.duration * 0.1);
        });

        video.addEventListener("seeked", async () => {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 360;
            const ctx = canvas.getContext("2d");
            if (!ctx) throw new Error("Canvas not supported");
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const blob = await new Promise<Blob>((res, rej) => canvas.toBlob(b => b ? res(b) : rej(new Error("Failed to create image")), "image/jpeg", 0.9));
            const file = new File([blob], "thumbnail.jpg", { type: "image/jpeg" });
            const url = await uploadImageFile(file);
            onChange(url);
            video.remove();
            resolve();
          } catch (err) {
            reject(err);
          }
        });

        video.addEventListener("error", () => reject(new Error("Could not load video. The video URL may not support cross-origin access.")));
        video.load();
      });
    } catch (err) {
      setCaptureError(err instanceof Error ? err.message : "Capture failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <Label>Thumbnail</Label>

      {value ? (
        <div className="relative rounded-xl border border-border/50 overflow-hidden group">
          <img src={value} alt="Thumbnail preview" className="w-full h-32 object-cover" />
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button type="button" size="sm" variant="outline" className="bg-background/80 h-8 text-xs"
              onClick={() => fileInputRef.current?.click()} disabled={busy}>
              <Upload className="w-3 h-3 mr-1" /> Replace
            </Button>
            <Button type="button" size="sm" variant="outline"
              className="bg-background/80 h-8 text-xs text-destructive border-destructive/50"
              onClick={() => onChange("")}>
              <X className="w-3 h-3 mr-1" /> Remove
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex rounded-xl border border-border/50 overflow-hidden">
            <button type="button" onClick={() => setMode("upload")}
              className={cn("flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors border-r border-border/50",
                mode === "upload" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}>
              <ImageIcon className="w-3 h-3" /> Upload Image
            </button>
            {canCapture && (
              <button type="button" onClick={() => setMode("capture")}
                className={cn("flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors border-r border-border/50",
                  mode === "capture" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}>
                <Camera className="w-3 h-3" /> Auto-capture
              </button>
            )}
            <button type="button" onClick={() => setMode("url")}
              className={cn("flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors",
                mode === "url" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}>
              <Link className="w-3 h-3" /> Paste URL
            </button>
          </div>

          {mode === "upload" && (
            <div
              onClick={() => !busy && fileInputRef.current?.click()}
              className={cn("border-2 border-dashed border-border/50 rounded-xl p-5 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors",
                busy && "pointer-events-none opacity-70")}>
              {busy ? (
                <><Loader2 className="w-5 h-5 mx-auto mb-1 text-primary animate-spin" /><p className="text-xs text-muted-foreground">Uploading…</p></>
              ) : (
                <><ImageIcon className="w-5 h-5 mx-auto mb-1 text-muted-foreground" /><p className="text-xs font-medium">Click to upload an image</p><p className="text-xs text-muted-foreground">JPG, PNG, or WebP</p></>
              )}
            </div>
          )}

          {mode === "capture" && canCapture && (
            <div className="space-y-2">
              <Button type="button" variant="outline" size="sm" onClick={handleCapture} disabled={busy}
                className="w-full rounded-xl border-border/50 gap-2">
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                {busy ? "Capturing frame…" : "Grab thumbnail from video"}
              </Button>
              {captureError && <p className="text-xs text-destructive">{captureError}</p>}
              <p className="text-xs text-muted-foreground">Captures a frame from ~2 seconds into the video. Only works for direct MP4 links.</p>
            </div>
          )}

          {mode === "url" && (
            <Input
              type="url"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="bg-background border-border rounded-xl"
              placeholder="https://img.youtube.com/vi/.../hqdefault.jpg"
            />
          )}

          {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}
        </>
      )}

      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/*" className="hidden" onChange={handleImageUpload} />
    </div>
  );
}

function VideoFormModal({ video, onClose }: { video?: Video; onClose: () => void }) {
  const { mutate: create, isPending: creating } = useCreateVideo();
  const { mutate: update, isPending: updating } = useUpdateVideo();
  const { toast } = useToast();

  const { register, handleSubmit, watch } = useForm<VideoInput>({
    defaultValues: video ? {
      title: video.title,
      description: video.description || "",
      url: video.url,
      thumbnailUrl: video.thumbnailUrl || "",
    } : { title: "", description: "", url: "", thumbnailUrl: "" }
  });

  const [thumbnailUrl, setThumbnailUrl] = useState(video?.thumbnailUrl || "");
  const videoUrl = watch("url");

  const onSubmit = (data: VideoInput) => {
    const payload = {
      ...data,
      description: data.description || undefined,
      thumbnailUrl: thumbnailUrl || undefined,
    };
    if (video) {
      update({ id: video.id, data: payload }, {
        onSuccess: () => { toast({ title: "Video updated" }); onClose(); },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" })
      });
    } else {
      create(payload, {
        onSuccess: () => { toast({ title: "Video added" }); onClose(); },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" })
      });
    }
  };

  const pending = creating || updating;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[520px] bg-card border-border/50 text-foreground max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{video ? "Edit Video" : "Add Video"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input {...register("title", { required: true })} className="bg-background border-border rounded-xl" placeholder="Summer Highlights" />
          </div>
          <div className="space-y-2">
            <Label>Description (Optional)</Label>
            <Textarea {...register("description")} className="bg-background border-border rounded-xl min-h-[80px]" placeholder="What this video is about..." />
          </div>
          <div className="space-y-2">
            <Label>Video URL</Label>
            <Input type="url" {...register("url", { required: true })} className="bg-background border-border rounded-xl" placeholder="https://example.com/video.mp4" />
            <p className="text-xs text-muted-foreground">Direct MP4 link or YouTube/Vimeo URL.</p>
          </div>
          <ThumbnailPicker value={thumbnailUrl} onChange={setThumbnailUrl} videoUrl={videoUrl} />
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={pending} className="rounded-xl border-border/50 hover:bg-secondary">Cancel</Button>
            <Button type="submit" disabled={pending} className="rounded-xl bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20">
              {pending ? "Saving..." : video ? "Save Changes" : "Add Video"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteVideoDialog({ id, onClose }: { id: number | null; onClose: () => void }) {
  const { mutate, isPending } = useDeleteVideo();
  const { toast } = useToast();

  const handleConfirm = () => {
    if (!id) return;
    mutate(id, {
      onSuccess: () => { toast({ title: "Video deleted" }); onClose(); },
      onError: (err: any) => { toast({ title: "Error", description: err.message, variant: "destructive" }); onClose(); }
    });
  };

  return (
    <AlertDialog open={id !== null} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="bg-card border-border/50 text-foreground">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display">Delete Video</AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground">Are you sure? This will permanently remove the video from the app.</AlertDialogDescription>
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
