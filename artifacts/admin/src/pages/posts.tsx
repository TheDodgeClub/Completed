import { useState } from "react";
import { usePosts, useCreatePost, useUpdatePost, useDeletePost, Post, PostInput } from "@/hooks/use-posts";
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
import { Plus, Edit2, Trash2, Globe, LockKeyhole } from "lucide-react";
import { useForm } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";

export default function Posts() {
  const { data: posts, isLoading } = usePosts();
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  if (isLoading) return <div className="p-8 text-muted-foreground animate-pulse">Loading posts...</div>;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Community Posts</h1>
          <p className="text-muted-foreground mt-1">Manage news and updates on the message board.</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="bg-primary hover:bg-primary/90 text-white rounded-xl shadow-lg shadow-primary/20">
          <Plus className="w-4 h-4 mr-2" /> New Post
        </Button>
      </div>

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
    const payload = {
      ...data,
      imageUrl: data.imageUrl || undefined,
    };

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
      <DialogContent className="sm:max-w-[600px] bg-card border-border/50 text-foreground">
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
          <div className="space-y-2">
            <Label>Image URL (Optional)</Label>
            <Input type="url" {...register("imageUrl")} className="bg-background border-border rounded-xl" placeholder="https://..." />
          </div>
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
