import { Layout } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Video } from "lucide-react";
import { Link } from "wouter";

export default function SettingsPage() {
  return (
    <Layout>
      <div className="p-8 space-y-8 max-w-2xl">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">App Settings</h1>
          <p className="text-muted-foreground mt-1">Configure global settings for the mobile app.</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Video className="w-5 h-5 text-primary" />
              <CardTitle>Home Screen Hero Video</CardTitle>
            </div>
            <CardDescription>
              The hero video that plays at the top of the mobile home screen is now managed from the{" "}
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
      </div>
    </Layout>
  );
}
