import { useState } from "react";
import { useMerch, useCreateMerch, useUpdateMerch, useDeleteMerch, MerchProduct, MerchInput } from "@/hooks/use-merch";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { DeleteConfirmDialog } from "./events";
import { Plus, Edit2, Trash2, ShoppingBag, ExternalLink, Image as ImageIcon } from "lucide-react";
import { ImageUploader } from "@/components/image-uploader";
import { useForm } from "react-hook-form";
import { Switch } from "@/components/ui/switch";

export default function Merch() {
  const { data: merch, isLoading } = useMerch();
  const [editingProduct, setEditingProduct] = useState<MerchProduct | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  if (isLoading) return <div className="p-8 text-muted-foreground animate-pulse">Loading merchandise...</div>;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Merchandise</h1>
          <p className="text-muted-foreground mt-1">Manage store inventory, links, and products.</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="bg-primary hover:bg-primary/90 text-white rounded-xl shadow-lg shadow-primary/20">
          <Plus className="w-4 h-4 mr-2" /> Add Product
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {merch?.map((product) => (
          <Card key={product.id} className="bg-card border-border/50 hover:border-border transition-colors overflow-hidden group flex flex-col shadow-lg shadow-black/10">
            <div className="relative aspect-square bg-secondary/50">
              {product.imageUrl ? (
                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-500" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ShoppingBag className="w-12 h-12 text-muted-foreground/30" />
                </div>
              )}
              <div className="absolute top-3 right-3 flex gap-2">
                <Button variant="secondary" size="icon" className="w-8 h-8 rounded-full bg-background/80 backdrop-blur opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setEditingProduct(product)}>
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button variant="destructive" size="icon" className="w-8 h-8 rounded-full bg-destructive/80 backdrop-blur opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setDeleteId(product.id)}>
                  <Trash2 className="w-4 h-4 text-white" />
                </Button>
              </div>
              <div className="absolute top-3 left-3">
                <Badge variant={product.inStock ? "default" : "destructive"} className={product.inStock ? "bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30 border-none" : "border-none bg-red-500/20 text-red-500"}>
                  {product.inStock ? "In Stock" : "Sold Out"}
                </Badge>
              </div>
            </div>
            
            <div className="p-5 flex flex-col flex-1">
              <div className="flex justify-between items-start gap-2 mb-2">
                <h3 className="font-display font-bold text-lg text-foreground leading-tight">{product.name}</h3>
                <span className="font-display font-bold text-lg text-primary">{formatCurrency(product.price)}</span>
              </div>
              
              <Badge variant="outline" className="w-fit mb-3 text-xs capitalize border-border/50 text-muted-foreground">
                {product.category}
              </Badge>
              
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2 flex-1">{product.description}</p>
              
              {product.buyUrl && (
                <a href={product.buyUrl} target="_blank" rel="noreferrer" className="mt-auto">
                  <Button variant="outline" className="w-full rounded-lg border-border/50 hover:bg-secondary group/btn">
                    Store Link <ExternalLink className="w-4 h-4 ml-2 text-muted-foreground group-hover/btn:text-foreground" />
                  </Button>
                </a>
              )}
            </div>
          </Card>
        ))}
      </div>
      
      {merch?.length === 0 && (
        <div className="p-12 text-center border-2 border-dashed border-border/50 rounded-2xl">
          <ShoppingBag className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-foreground">No merchandise</h3>
          <p className="text-muted-foreground">Add some products to your store.</p>
        </div>
      )}

      {isCreateOpen && <MerchFormModal onClose={() => setIsCreateOpen(false)} />}
      {editingProduct && <MerchFormModal product={editingProduct} onClose={() => setEditingProduct(null)} />}
      
      <DeleteConfirmDialog 
        id={deleteId} 
        onClose={() => setDeleteId(null)} 
        useDeleteHook={useDeleteMerch}
        title="Delete Product"
        description="Are you sure? This removes the product from the store display."
      />
    </div>
  );
}

function MerchFormModal({ product, onClose }: { product?: MerchProduct; onClose: () => void }) {
  const { mutate: create, isPending: creating } = useCreateMerch();
  const { mutate: update, isPending: updating } = useUpdateMerch();
  const { toast } = useToast();
  
  const { register, handleSubmit, setValue, watch } = useForm<MerchInput>({
    defaultValues: product ? {
      name: product.name,
      description: product.description,
      price: product.price,
      imageUrl: product.imageUrl || "",
      buyUrl: product.buyUrl || "",
      category: product.category,
      inStock: product.inStock,
    } : {
      name: "", description: "", price: 0, imageUrl: "", buyUrl: "", category: "apparel", inStock: true
    }
  });

  const inStock = watch("inStock");

  const onSubmit = (data: MerchInput) => {
    const payload = {
      ...data,
      price: Number(data.price),
      imageUrl: data.imageUrl || undefined,
      buyUrl: data.buyUrl || undefined,
    };

    if (product) {
      update({ id: product.id, ...payload }, {
        onSuccess: () => { toast({ title: "Product updated" }); onClose(); },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" })
      });
    } else {
      create(payload, {
        onSuccess: () => { toast({ title: "Product created" }); onClose(); },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" })
      });
    }
  };

  const pending = creating || updating;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] bg-card border-border/50 text-foreground">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{product ? "Edit Product" : "Add Product"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-2">
              <Label>Product Name</Label>
              <Input {...register("name", { required: true })} className="bg-background border-border rounded-xl" placeholder="Classic Tee" />
            </div>
            <div className="space-y-2">
              <Label>Price (£)</Label>
              <Input type="number" step="0.01" min="0" {...register("price", { required: true })} className="bg-background border-border rounded-xl" placeholder="20.00" />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea {...register("description", { required: true })} className="bg-background border-border rounded-xl min-h-[80px]" placeholder="Soft cotton t-shirt..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <select 
                {...register("category", { required: true })}
                className="flex h-10 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 text-foreground"
              >
                <option value="apparel">Apparel</option>
                <option value="accessories">Accessories</option>
                <option value="equipment">Equipment</option>
              </select>
            </div>
            <div className="space-y-2 flex flex-col justify-center pt-6 pl-4">
              <div className="flex items-center space-x-2">
                <Switch 
                  id="inStock" 
                  checked={inStock} 
                  onCheckedChange={(c) => setValue("inStock", c)}
                  className="data-[state=checked]:bg-primary"
                />
                <Label htmlFor="inStock" className="cursor-pointer">{inStock ? "In Stock" : "Out of Stock"}</Label>
              </div>
            </div>
          </div>

          <ImageUploader
            label="Product Image"
            value={watch("imageUrl") ?? ""}
            onChange={(url) => setValue("imageUrl", url || undefined)}
          />
          <div className="space-y-2">
            <Label>External Buy Link (Optional)</Label>
            <Input type="url" {...register("buyUrl")} className="bg-background border-border rounded-xl" placeholder="https://shop.dodgeclub.com/..." />
          </div>
          
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={pending} className="rounded-xl border-border/50 hover:bg-secondary">Cancel</Button>
            <Button type="submit" disabled={pending} className="rounded-xl bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20">
              {pending ? "Saving..." : "Save Product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
