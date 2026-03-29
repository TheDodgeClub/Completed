import { useState } from "react";
import { usePosts, useCreatePost, useUpdatePost, useDeletePost, Post, PostInput } from "@/hooks/use-posts";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { DeleteConfirmDialog } from "./events";
import { Plus, Edit2, Trash2, Globe, LockKeyhole, MessageSquare, Star, Flag, ShieldCheck, AlertTriangle } from "lucide-react";
import { ImageUploader } from "@/components/image-uploader";
import { useForm } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";

/* ── Types ── */
interface ReportEntry {
  id: number;
  reason: string | null;
  resolved: boolean;
  reportedBy: string;
  createdAt: string;
}
interface PostReportGroup {
  post: {
    id: number;
    title: string;
    content: string;
    authorName: string;
    createdAt: string;
  };
  reports: ReportEntry[];
}

/* ── API helpers ── */
async function fetchPostReports(): Promise<PostReportGroup[]> {
  return fetchApi<PostReportGroup[]>("/api/admin/post-reports");
}
async function resolveReport(id: number) {
  return fetchApi<{ ok: boolean }>(`/api/admin/post-reports/${id}/resolve`, { method: "POST" });
}
async function deleteReportedPost(postId: number) {
  return fetchApi<{ ok: boolean }>(`/api/admin/post-reports/posts/${postId}`, { method: "DELETE" });
}

/* ── Post Reports Tab ── */
function PostReportsTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: groups = [], isLoading } = useQuery({ queryKey: ["post-reports"], queryFn: fetchPostReports });

  const resolveMut = useMutation({
    mutationFn: resolveReport,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["post-reports"] }); toast({ title: "Report resolved" }); },
  });

  const deleteMut = useMutation({
    mutationFn: deleteReportedPost,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["post-reports"] }); toast({ title: "Post deleted" }); },
  });

  if (isLoading) return <div className="p-8 text-muted-foreground animate-pulse">Loading reports...</div>;

  const openGroups = groups.filter(g => g.reports.some(r => !r.resolved));
  const resolvedGroups = groups.filter(g => g.reports.every(r => r.resolved));

  if (groups.length === 0) {
    return (
      <div className="p-12 text-center border-2 border-dashed border-border/50 rounded-2xl">
        <ShieldCheck className="w-12 h-12 text-green-500/70 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-foreground">No reports</h3>
        <p className="text-muted-foreground">All clear — no flagged posts.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {openGroups.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-500" /> Needs Review ({openGroups.length})
          </h2>
          {openGroups.map(({ post, reports }) => (
            <Card key={post.id} className="bg-card border-border/50 shadow-lg shadow-black/10 p-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-bold text-foreground text-base">{post.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">By {post.authorName} · {formatDateTime(post.createdAt)}</p>
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{post.content}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 rounded-lg border-destructive/30 text-destructive hover:bg-destructive/10"
                  onClick={() => { if (confirm("Delete this post permanently?")) deleteMut.mutate(post.id); }}
                  disabled={deleteMut.isPending}
                >
                  <Trash2 className="w-4 h-4 mr-1" /> Delete Post
                </Button>
              </div>
              <div className="space-y-2 border-t border-border/50 pt-4">
                {reports.filter(r => !r.resolved).map(r => (
                  <div key={r.id} className="flex items-center justify-between gap-3 p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-lg">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{r.reportedBy}</p>
                      <p className="text-xs text-muted-foreground truncate">{r.reason ?? "No reason provided"} · {formatDateTime(r.createdAt)}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0 rounded-lg"
                      onClick={() => resolveMut.mutate(r.id)}
                      disabled={resolveMut.isPending}
                    >
                      <ShieldCheck className="w-4 h-4 mr-1" /> Resolve
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {resolvedGroups.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-muted-foreground flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" /> Resolved ({resolvedGroups.length})
          </h2>
          {resolvedGroups.map(({ post, reports }) => (
            <Card key={post.id} className="bg-card border-border/50 shadow-sm p-4 opacity-60">
              <p className="font-medium text-foreground text-sm">{post.title}</p>
              <p className="text-xs text-muted-foreground">{reports.length} report{reports.length !== 1 ? "s" : ""} — all resolved</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Main Page ── */
export default function Posts() {
  const { data: posts, isLoading } = usePosts();
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [tab, setTab] = useState<"posts" | "reports">("posts");

  const { data: reports = [] } = useQuery({ queryKey: ["post-reports"], queryFn: fetchPostReports });
  const openCount = reports.reduce((n, g) => n + g.reports.filter(r => !r.resolved).length, 0);

  if (isLoading) return <div className="p-8 text-muted-foreground animate-pulse">Loading posts...</div>;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Community Posts</h1>
          <p className="text-muted-foreground mt-1">Manage news and updates on the message board.</p>
        </div>
        {tab === "posts" && (
          <Button onClick={() => setIsCreateOpen(true)} className="bg-primary hover:bg-primary/90 text-white rounded-xl shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4 mr-2" /> New Post
          </Button>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 border-b border-border/50">
        <button
          onClick={() => setTab("posts")}
          className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${tab === "posts" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          <MessageSquare className="inline w-4 h-4 mr-1.5" />Posts
        </button>
        <button
          onClick={() => setTab("reports")}
          className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${tab === "reports" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          <Flag className="inline w-4 h-4" />Reports
          {openCount > 0 && (
            <span className="ml-1 bg-red-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5 leading-none">{openCount}</span>
          )}
        </button>
      </div>

      {tab === "posts" ? (
        <div className="space-y-4">
          {posts?.map((post) => (
            <Card key={post.id} className="bg-card border-border/50 hover:border-border transition-colors shadow-lg shadow-black/10 overflow-hidden">
              <div className="flex flex-col md:flex-row">
                <div className="p-6 flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <Badge variant="outline" className={post.isMembersOnly ? "border-accent text-accent bg-accent/5" : "border-blue-500 text-blue-500 bg-blue-500/5"}>
                      {post.isMembersOnly ? <LockKeyhole className="w-3 h-3 mr-1" /> : <Globe className="w-3 h-3 mr-1" />}
                      {post.isMembersOnly ? "Members Only" : "Public"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{formatDateTime(post.createdAt)}</span>
                    <span className="text-xs text-muted-foreground font-medium">• By {post.authorName}</span>
                  </div>
                  <h3 className="font-display font-bold text-xl text-foreground mb-2">{post.title}</h3>
                  <p className="text-muted-foreground text-sm whitespace-pre-wrap">{post.content}</p>
                </div>
                {post.imageUrl && (
                  <div className="w-full md:w-64 h-48 md:h-auto shrink-0 bg-secondary relative">
                    <img src={post.imageUrl} alt={post.title} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="p-4 md:border-l border-border/50 bg-secondary/20 flex md:flex-col items-center justify-center gap-2">
                  <Button variant="outline" size="sm" className="w-full justify-center rounded-lg border-border/50 hover:bg-primary/10 hover:text-primary hover:border-primary/30" onClick={() => setEditingPost(post)}>
                    <Edit2 className="w-4 h-4 mr-2 md:mr-0 lg:mr-2" /> <span className="md:hidden lg:inline">Edit</span>
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-center rounded-lg border-border/50 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30" onClick={() => setDeleteId(post.id)}>
                    <Trash2 className="w-4 h-4 mr-2 md:mr-0 lg:mr-2" /> <span className="md:hidden lg:inline">Delete</span>
                  </Button>
                </div>
              </div>
            </Card>
          ))}
          {posts?.length === 0 && (
            <div className="p-12 text-center border-2 border-dashed border-border/50 rounded-2xl">
              <MessageSquare className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-foreground">No posts found</h3>
              <p className="text-muted-foreground">Share an update with the community.</p>
            </div>
          )}
        </div>
      ) : (
        <PostReportsTab />
      )}

      {isCreateOpen && <PostFormModal onClose={() => setIsCreateOpen(false)} />}
      {editingPost && <PostFormModal post={editingPost} onClose={() => setEditingPost(null)} />}
      <DeleteConfirmDialog
        id={deleteId}
        onClose={() => setDeleteId(null)}
        useDeleteHook={useDeletePost}
        title="Delete Post"
        description="Are you sure? This action cannot be undone."
      />
    </div>
  );
}

function PostFormModal({ post, onClose }: { post?: Post; onClose: () => void }) {
  const { mutate: create, isPending: creating } = useCreatePost();
  const { mutate: update, isPending: updating } = useUpdatePost();
  const { toast } = useToast();

  const { register, handleSubmit, setValue, watch } = useForm<PostInput>({
    defaultValues: post ? {
      title: post.title,
      content: post.content,
      imageUrl: post.imageUrl || "",
      isMembersOnly: post.isMembersOnly,
    } : {
      title: "", content: "", imageUrl: "", isMembersOnly: false
    }
  });

  const isMembersOnly = watch("isMembersOnly");

  const onSubmit = (data: PostInput) => {
    const payload = { ...data, imageUrl: data.imageUrl || null };
    if (post) {
      update({ id: post.id, ...payload }, {
        onSuccess: () => { toast({ title: "Post updated" }); onClose(); },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" })
      });
    } else {
      create(payload, {
        onSuccess: () => { toast({ title: "Post created" }); onClose(); },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" })
      });
    }
  };

  const pending = creating || updating;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] bg-card border-border/50 text-foreground max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{post ? "Edit Post" : "Create New Post"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 py-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input {...register("title", { required: true })} className="bg-background border-border rounded-xl font-medium" placeholder="Exciting news!" />
          </div>
          <div className="space-y-2">
            <Label>Content</Label>
            <Textarea {...register("content", { required: true })} className="bg-background border-border rounded-xl min-h-[150px] font-medium" placeholder="Write your post here..." />
          </div>
          <ImageUploader
            label="Post Image"
            value={watch("imageUrl") ?? ""}
            onChange={(url) => setValue("imageUrl", url || null)}
          />
          <div className="flex items-center space-x-3 p-4 bg-background rounded-xl border border-border/50">
            <Checkbox
              id="isMembersOnly"
              checked={isMembersOnly}
              onCheckedChange={(c) => setValue("isMembersOnly", c === true)}
              className="border-muted-foreground data-[state=checked]:bg-primary data-[state=checked]:border-primary"
            />
            <div className="space-y-1 leading-none">
              <Label htmlFor="isMembersOnly" className="font-medium cursor-pointer">Restrict to Members Only</Label>
              <p className="text-xs text-muted-foreground">Guests and non-members will not be able to see this post.</p>
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={pending} className="rounded-xl border-border/50 hover:bg-secondary">Cancel</Button>
            <Button type="submit" disabled={pending} className="rounded-xl bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20">
              {pending ? "Publishing..." : "Publish Post"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
