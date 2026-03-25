import { useState } from "react";
import { useLogin } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { mutate: login, isPending } = useLogin();
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login({ email, password }, {
      onError: (err: any) => {
        toast({
          title: "Login Failed",
          description: err.message || "Invalid credentials or unauthorized.",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left side form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 z-10 relative bg-background">
        <div className="w-full max-w-md space-y-8">
          <div>
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center shadow-xl shadow-primary/20 mb-8">
              <span className="font-display font-bold text-white text-3xl leading-none tracking-tighter">DC</span>
            </div>
            <h1 className="text-4xl font-display font-bold text-foreground">Welcome back</h1>
            <p className="text-muted-foreground mt-2 text-lg">Sign in to the Dodge Club admin portal.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">Email address</Label>
              <Input
                id="email"
                type="email"
                required
                className="bg-secondary/50 border-border h-12 text-base rounded-xl focus-visible:ring-primary/50"
                placeholder="admin@dodgeclub.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">Password</Label>
              <Input
                id="password"
                type="password"
                required
                className="bg-secondary/50 border-border h-12 text-base rounded-xl focus-visible:ring-primary/50"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 text-base font-semibold rounded-xl bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25 transition-all"
              disabled={isPending}
            >
              {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign in to Dashboard"}
            </Button>
          </form>
          
          <div className="pt-8 border-t border-border/50 text-center text-sm text-muted-foreground">
            <p>Protected area. Authorized personnel only.</p>
          </div>
        </div>
      </div>

      {/* Right side image */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/20 to-transparent z-10" />
        <img 
          src={`${import.meta.env.BASE_URL}images/login-bg.png`}
          alt="Dodge Club Arena" 
          className="w-full h-full object-cover"
        />
      </div>
    </div>
  );
}
