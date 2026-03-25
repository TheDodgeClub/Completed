import { useState } from "react";
import { useMembers } from "@/hooks/use-members";
import { formatDateTime } from "@/lib/format";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Search, Star, Loader2, ExternalLink, Users, TrendingUp, Crown } from "lucide-react";

const ELITE_PRICE_GBP = 8.99;
const STRIPE_DASHBOARD_BASE = "https://dashboard.stripe.com/subscriptions";

function resolveAvatarUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("/objects/")) return `/api/storage${url}`;
  return url;
}

export default function EliteMembers() {
  const { data: members, isLoading } = useMembers();
  const [search, setSearch] = useState("");

  const eliteMembers = members?.filter(m => m.isElite) ?? [];
  const filteredElite = eliteMembers.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.email.toLowerCase().includes(search.toLowerCase())
  );

  const monthlyRevenue = (eliteMembers.length * ELITE_PRICE_GBP).toFixed(2);
  const annualRevenue = (eliteMembers.length * ELITE_PRICE_GBP * 12).toFixed(2);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-yellow-500/15 border border-yellow-500/25 flex items-center justify-center">
              <Crown className="w-5 h-5 text-yellow-500" />
            </span>
            Elite Members
          </h1>
          <p className="text-muted-foreground mt-1">Members subscribed to the Elite plan at £8.99/month.</p>
        </div>
        <Button
          variant="outline"
          className="border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10 gap-2"
          onClick={() => window.open(STRIPE_DASHBOARD_BASE, "_blank")}
        >
          <ExternalLink className="w-4 h-4" />
          Stripe Dashboard
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card border-border/50 p-5 shadow-lg shadow-black/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/15 flex items-center justify-center">
              <Users className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{eliteMembers.length}</p>
              <p className="text-sm text-muted-foreground">Active Elite Members</p>
            </div>
          </div>
        </Card>
        <Card className="bg-card border-border/50 p-5 shadow-lg shadow-black/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/15 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">£{monthlyRevenue}</p>
              <p className="text-sm text-muted-foreground">Monthly Recurring Revenue</p>
            </div>
          </div>
        </Card>
        <Card className="bg-card border-border/50 p-5 shadow-lg shadow-black/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center">
              <Star className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">£{annualRevenue}</p>
              <p className="text-sm text-muted-foreground">Projected Annual Revenue</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2 bg-card border border-border/50 rounded-xl px-4 py-2 shadow-lg shadow-black/5 w-full max-w-md">
        <Search className="w-5 h-5 text-muted-foreground shrink-0" />
        <Input
          className="border-0 bg-transparent focus-visible:ring-0 px-2 h-10 shadow-none text-foreground"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      {eliteMembers.length === 0 ? (
        <div className="p-16 text-center border-2 border-dashed border-border/50 rounded-2xl">
          <Crown className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-foreground">No Elite Members Yet</h3>
          <p className="text-muted-foreground mt-1">Members will appear here after subscribing at £8.99/month.</p>
        </div>
      ) : (
        <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-lg shadow-black/10">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-secondary/50 border-b border-border/50">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-muted-foreground py-4 px-6">Member</TableHead>
                  <TableHead className="text-muted-foreground py-4">Status</TableHead>
                  <TableHead className="text-muted-foreground py-4">Elite Since</TableHead>
                  <TableHead className="text-muted-foreground py-4">Stripe Subscription</TableHead>
                  <TableHead className="text-muted-foreground py-4 text-right px-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredElite.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      No elite members match &quot;{search}&quot;
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredElite.map((member) => (
                    <TableRow key={member.id} className="border-border/50 hover:bg-white/[0.02]">
                      <TableCell className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center overflow-hidden border border-yellow-500/30 shrink-0">
                            {member.avatarUrl ? (
                              <img src={resolveAvatarUrl(member.avatarUrl)} alt={member.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="font-bold text-sm">{member.name.charAt(0)}</span>
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-foreground flex items-center gap-1.5">
                              {member.name}
                              <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                            </div>
                            <div className="text-xs text-muted-foreground">{member.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/25">
                          <Star className="w-3 h-3 mr-1 fill-yellow-500" />
                          Active Elite
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {member.eliteSince
                          ? formatDateTime(member.eliteSince)
                          : <span className="text-muted-foreground/50 italic">—</span>}
                      </TableCell>
                      <TableCell>
                        {member.stripeSubscriptionId ? (
                          <code className="text-xs bg-secondary px-2 py-1 rounded text-muted-foreground font-mono">
                            {member.stripeSubscriptionId}
                          </code>
                        ) : (
                          <span className="text-muted-foreground/50 italic text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right px-6">
                        {member.stripeSubscriptionId && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-yellow-500 hover:bg-yellow-500/10"
                            onClick={() => window.open(`${STRIPE_DASHBOARD_BASE}/${member.stripeSubscriptionId}`, "_blank")}
                          >
                            <ExternalLink className="w-4 h-4 mr-1" />
                            View in Stripe
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {filteredElite.length > 0 && (
            <div className="px-6 py-3 border-t border-border/50 bg-secondary/20">
              <p className="text-xs text-muted-foreground">
                {filteredElite.length} of {eliteMembers.length} elite member{eliteMembers.length !== 1 ? "s" : ""} shown
                {eliteMembers.length > 0 && ` · £${monthlyRevenue}/month total`}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
