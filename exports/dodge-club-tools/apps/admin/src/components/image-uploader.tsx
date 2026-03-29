import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, X, Image as ImageIcon, Link } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageUploaderProps {
  value?: string;
  onChange: (url: string) => void;
  label?: string;
}

async function requestUploadUrl(file: File): Promise<{ uploadURL: string; objectPath: string }> {
  const res = await fetch("/api/storage/uploads/request-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type || "application/octet-stream" }),
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
    headers: { "Content-Type": file.type || "application/octet-stream" },
  });
  if (!res.ok) throw new Error("Upload to storage failed");
}

export function ImageUploader({ value, onChange, label = "Image" }: ImageUploaderProps) {
  const [mode, setMode] = useState<"upload" | "url">("upload");
  const [urlInput, setUrlInput] = useState(value?.startsWith("/api/storage") ? "" : value ?? "");
  const [preview, setPreview] = useState<string | undefined>(value || undefined);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const localPreview = URL.createObjectURL(file);
    setPreview(localPreview);
    setIsUploading(true);
    setError(null);
    setProgress(10);

    try {
      const { uploadURL, objectPath } = await requestUploadUrl(file);
      setProgress(40);
      await uploadToGcs(file, uploadURL);
      setProgress(100);
      const serveUrl = `/api/storage${objectPath}`;
      setPreview(serveUrl);
      onChange(serveUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setPreview(undefined);
      onChange("");
    } finally {
      setIsUploading(false);
    }
  };

  const handleUrlSubmit = () => {
    const trimmed = urlInput.trim();
    if (trimmed) {
      setPreview(trimmed);
      onChange(trimmed);
    }
  };

  const handleClear = () => {
    setPreview(undefined);
    setUrlInput("");
    setError(null);
    onChange("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-3">
      <Label>{label} (Optional)</Label>

      {preview ? (
        <div className="relative group rounded-xl overflow-hidden border border-border/50 bg-background">
          <img
            src={preview}
            alt="Preview"
            className="w-full h-40 object-cover"
            onError={() => { setPreview(undefined); onChange(""); }}
          />
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
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
            <div className="absolute bottom-0 left-0 h-1 bg-primary transition-all" style={{ width: `${progress}%` }} />
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex rounded-xl border border-border/50 overflow-hidden">
            <button
              type="button"
              onClick={() => setMode("upload")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium transition-colors border-r border-border/50",
                mode === "upload" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Upload className="w-3.5 h-3.5" /> Upload File
            </button>
            <button
              type="button"
              onClick={() => setMode("url")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium transition-colors",
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
                  "border-2 border-dashed border-border/50 rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors",
                  isUploading && "pointer-events-none opacity-70"
                )}
              >
                <ImageIcon className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {isUploading
                    ? `Uploading… ${progress}%`
                    : "Click to upload JPEG, PNG, GIF, or WebP"}
                </p>
              </div>
              {error && <p className="text-xs text-destructive mt-1">{error}</p>}
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                type="url"
                placeholder="https://..."
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="bg-background border-border/50 rounded-xl"
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleUrlSubmit())}
              />
              <Button type="button" variant="outline" onClick={handleUrlSubmit} className="shrink-0">
                Use URL
              </Button>
            </div>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
