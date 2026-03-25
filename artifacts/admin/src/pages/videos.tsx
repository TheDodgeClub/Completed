import { useState, useRef, useEffect } from "react";
import { useVideos, useCreateVideo, useUpdateVideo, useDeleteVideo, usePublishVideo, Video, VideoInput } from "@/hooks/use-videos";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit2, Trash2, Globe, EyeOff, Video as VideoIcon, ExternalLink, Upload, X, Link, Save, Loader2 } from "lucide-react";
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

function HeroVideoSection() {
  const { data: settings, isLoading } = useSettings();
  const { mutate: updateSettings, isPending } = useUpdateSettings();
  const { toast } = useToast();

  const [heroUrl, setHeroUrl] = useState("");
  const [mode, setMode] = useState<"upload" | "url">("upload");
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (settings) setHeroUrl(settings.homeVideoUrl ?? "");
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
      setHeroUrl(serveUrl);
      setProgress(100);
      toast({ title: "Video uploaded", description: "Click Save to apply it to the home screen." });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleSave() {
    updateSettings(
      { homeVideoUrl: heroUrl.trim() || null },
      {
        onSuccess: () => toast({ title: "Saved", description: "Home screen hero video updated." }),
        onError: () => toast({ title: "Error", description: "Failed to save.", variant: "destructive" }),
      }
    );
  }

  if (isLoading) return null;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <VideoIcon className="w-5 h-5 text-primary" />
          <CardTitle className="text-base">Home Screen Hero Video</CardTitle>
        </div>
        <CardDescription>
          This video auto-plays (muted &amp; looped) at the top of the mobile app home screen. Members can tap to unmute.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {heroUrl ? (
          <div className="space-y-2">
            <div className="relative rounded-xl border border-border/50 bg-black overflow-hidden">
              <video src={heroUrl} className="w-full h-36 object-cover" muted playsInline />
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center gap-2 opacity-0 hover:opacity-100 transition-opacity">
                <Button type="button" size="sm" variant="outline" className="bg-background/80 h-8 text-xs"
                  onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                  <Upload className="w-3 h-3 mr-1" /> Replace
                </Button>
                <Button type="button" size="sm" variant="outline"
                  className="bg-background/80 h-8 text-xs text-destructive border-destructive/50"
                  onClick={() => setHeroUrl("")}>
                  <X className="w-3 h-3 mr-1" /> Remove
                </Button>
              </div>
              {isUploading && (
                <div className="absolute bottom-0 left-0 h-1 bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex rounded-xl border border-border/50 overflow-hidden">
              <button type="button" onClick={() => setMode("upload")}
                className={cn("flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors border-r border-border/50",
                  mode === "upload" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}>
                <Upload className="w-3 h-3" /> Upload File
              </button>
              <button type="button" onClick={() => setMode("url")}
                className={cn("flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors",
                  mode === "url" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}>
                <Link className="w-3 h-3" /> Paste URL
              </button>
            </div>
            {mode === "upload" ? (
              <div>
                <div onClick={() => !isUploading && fileInputRef.current?.click()}
                  className={cn("border-2 border-dashed border-border/50 rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors",
                    isUploading && "pointer-events-none opacity-70")}>
                  {isUploading ? (
                    <>
                      <Loader2 className="w-6 h-6 mx-auto mb-1.5 text-primary animate-spin" />
                      <p className="text-xs text-muted-foreground">Uploading… {progress}%</p>
                      <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden w-32 mx-auto">
                        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
                      </div>
                    </>
                  ) : (
                    <>
                      <VideoIcon className="w-6 h-6 mx-auto mb-1.5 text-muted-foreground" />
                      <p className="text-xs font-medium">Click to upload</p>
                      <p className="text-xs text-muted-foreground">MP4, MOV, or WebM</p>
                    </>
                  )}
                </div>
                {uploadError && <p className="text-xs text-destructive mt-1">{uploadError}</p>}
              </div>
            ) : (
              <Input type="url" placeholder="https://example.com/promo.mp4" value={heroUrl}
                onChange={(e) => setHeroUrl(e.target.value)}
                className="bg-background border-border/50 rounded-xl text-sm" />
            )}
          </div>
        )}

        <input ref={fileInputRef} type="file" accept="video/mp4,video/mov,video/quicktime,video/webm,video/*"
          className="hidden" onChange={handleFileChange} />

        <Button onClick={handleSave} disabled={isPending || isUploading} size="sm" className="w-full sm:w-auto">
          {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
          Save Hero Video
        </Button>
      </CardContent>
    </Card>
  );
}

export default function Videos() {
  const { data: videos, isLoading } = useVideos();
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

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

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Videos</h1>
          <p className="text-muted-foreground mt-1">Manage video content for the mobile app.</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="bg-primary hover:bg-primary/90 text-white rounded-xl shadow-lg shadow-primary/20">
          <Plus className="w-4 h-4 mr-2" /> Add Video
        </Button>
      </div>

      <HeroVideoSection />

      <div>
        <h2 className="text-lg font-semibold mb-3">Updates Videos</h2>
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
                {!videos || videos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-40 text-center text-muted-foreground">
                      <VideoIcon className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                      <p className="font-medium">No videos yet</p>
                      <p className="text-sm">Add your first video to share with members.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  videos.map((video) => (
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

      {isCreateOpen && <VideoFormModal onClose={() => setIsCreateOpen(false)} />}
      {editingVideo && <VideoFormModal video={editingVideo} onClose={() => setEditingVideo(null)} />}
      <DeleteVideoDialog id={deleteId} onClose={() => setDeleteId(null)} />
    </div>
  );
}

function VideoFormModal({ video, onClose }: { video?: Video; onClose: () => void }) {
  const { mutate: create, isPending: creating } = useCreateVideo();
  const { mutate: update, isPending: updating } = useUpdateVideo();
  const { toast } = useToast();

  const { register, handleSubmit } = useForm<VideoInput>({
    defaultValues: video ? {
      title: video.title,
      description: video.description || "",
      url: video.url,
      thumbnailUrl: video.thumbnailUrl || "",
    } : { title: "", description: "", url: "", thumbnailUrl: "" }
  });

  const onSubmit = (data: VideoInput) => {
    const payload = {
      ...data,
      description: data.description || undefined,
      thumbnailUrl: data.thumbnailUrl || undefined,
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
      <DialogContent className="sm:max-w-[500px] bg-card border-border/50 text-foreground">
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
            <Input type="url" {...register("url", { required: true })} className="bg-background border-border rounded-xl" placeholder="https://youtube.com/watch?v=..." />
            <p className="text-xs text-muted-foreground">YouTube, Vimeo, or any video URL. Members will tap to open in their browser.</p>
          </div>
          <div className="space-y-2">
            <Label>Thumbnail URL (Optional)</Label>
            <Input type="url" {...register("thumbnailUrl")} className="bg-background border-border rounded-xl" placeholder="https://img.youtube.com/vi/.../hqdefault.jpg" />
          </div>
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
