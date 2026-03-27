import { useMembers } from "@/hooks/use-members";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, Trophy, CircleDot, Medal } from "lucide-react";

const LEVEL_NAMES = ["Beginner", "Developing", "Experienced", "Skilled", "Advanced", "Pro", "League", "Expert", "Master", "Icon"];

const SUPPORTER_TIERS = [
  { name: "Club Friend", emoji: "🤝", minXp: 0 },
  { name: "Die Hard", emoji: "🔥", minXp: 150 },
  { name: "Club Legend", emoji: "⭐", minXp: 500 },
  { name: "Superfan", emoji: "🏆", minXp: 1000 },
];

function getSupporterTier(xp: number) {
  let t = SUPPORTER_TIERS[0];
  for (const tier of SUPPORTER_TIERS) { if (xp >= tier.minXp) t = tier; }
  return t;
}

function resolveAvatarUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("/objects/")) return `/api/storage${url}`;
  return url;
}

function RankBadge({ idx }: { idx: number }) {
  if (idx === 0) return <span className="w-6 text-center text-base font-black text-yellow-500 shrink-0">1</span>;
  if (idx === 1) return <span className="w-6 text-center text-base font-black text-slate-400 shrink-0">2</span>;
  if (idx === 2) return <span className="w-6 text-center text-base font-black text-amber-600 shrink-0">3</span>;
  return <span className="w-6 text-center text-sm font-bold text-muted-foreground shrink-0">{idx + 1}</span>;
}

function MemberAvatar({ member }: { member: { name: string; avatarUrl?: string | null } }) {
  return (
    <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center overflow-hidden border border-border/60 shrink-0">
      {member.avatarUrl ? (
        <img src={resolveAvatarUrl(member.avatarUrl)} alt={member.name} className="w-full h-full object-cover" />
      ) : (
        <span className="font-bold text-sm">{member.name.charAt(0)}</span>
      )}
    </div>
  );
}

type Board = "xp" | "medals" | "rings";

function LeaderboardCard({
  title, icon, iconColor, valueColor, barColor,
  members, getValue, getLabel, emptyMsg,
}: {
  title: string;
  icon: React.ReactNode;
  iconColor: string;
  valueColor: string;
  barColor: string;
  members: any[];
  getValue: (m: any) => number;
  getLabel: (m: any) => string;
  emptyMsg: string;
}) {
  const sorted = [...members].sort((a, b) => getValue(b) - getValue(a));
  const top = sorted.slice(0, 10);
  const maxVal = getValue(top[0] ?? {}) || 1;

  return (
    <Card className="bg-card border-border/60 shadow-sm">
      <CardHeader className="px-5 pt-5 pb-3">
        <CardTitle className={`flex items-center gap-2 text-sm font-bold ${iconColor}`}>
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5 space-y-1 pt-0">
        {top.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center">{emptyMsg}</div>
        ) : top.map((member, idx) => {
          const val = getValue(member);
          const pct = maxVal > 0 ? Math.max((val / maxVal) * 100, 2) : 2;
          const isSupporter = member.accountType === "supporter";
          const sub = isSupporter
            ? getSupporterTier(member.xp ?? 0).emoji + " " + getSupporterTier(member.xp ?? 0).name
            : LEVEL_NAMES[(member.level ?? 1) - 1] ?? "Player";

          return (
            <div
              key={member.id}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors ${idx < 3 ? "bg-secondary/40" : "hover:bg-secondary/30"}`}
            >
              <RankBadge idx={idx} />
              <MemberAvatar member={member} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="min-w-0">
                    <span className="font-semibold text-xs text-foreground truncate block">{member.name}</span>
                    <span className="text-[10px] text-muted-foreground">{sub}</span>
                  </div>
                  <span className={`text-xs font-bold shrink-0 ${valueColor}`}>{getLabel(member)}</span>
                </div>
                <div className="h-1 bg-secondary rounded-full overflow-hidden">
                  <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export default function Leaderboard() {
  const { data: members, isLoading } = useMembers();

  if (isLoading) {
    return <div className="p-8 text-muted-foreground animate-pulse text-sm">Loading leaderboard…</div>;
  }

  const all = members ?? [];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Leaderboard</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Top members ranked by XP, medals, and rings.</p>
      </div>

      {/* Top podium — top 3 by XP */}
      {all.length >= 3 && (() => {
        const top3 = [...all].sort((a, b) => (b.xp ?? 0) - (a.xp ?? 0)).slice(0, 3);
        const [first, second, third] = top3;
        return (
          <Card className="bg-card border-border/60 shadow-sm">
            <CardContent className="px-5 py-6">
              <div className="flex items-end justify-center gap-4">
                {/* 2nd */}
                <div className="flex flex-col items-center gap-2 flex-1 max-w-[140px]">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center overflow-hidden border-2 border-slate-300">
                      {second.avatarUrl
                        ? <img src={resolveAvatarUrl(second.avatarUrl)} alt={second.name} className="w-full h-full object-cover" />
                        : <span className="font-bold text-xl">{second.name.charAt(0)}</span>}
                    </div>
                    <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-slate-300 text-slate-700 font-black text-xs flex items-center justify-center border-2 border-card">2</span>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-xs text-foreground truncate max-w-[120px]">{second.name.split(" ")[0]}</p>
                    <p className="text-xs text-slate-500 font-bold">{(second.xp ?? 0).toLocaleString()} XP</p>
                  </div>
                  <div className="w-full h-12 bg-slate-200/50 dark:bg-slate-700/30 rounded-t-lg border border-border/40" />
                </div>

                {/* 1st */}
                <div className="flex flex-col items-center gap-2 flex-1 max-w-[160px]">
                  <div className="text-2xl">👑</div>
                  <div className="relative">
                    <div className="w-18 h-18 w-[72px] h-[72px] rounded-full bg-secondary flex items-center justify-center overflow-hidden border-[3px] border-yellow-400">
                      {first.avatarUrl
                        ? <img src={resolveAvatarUrl(first.avatarUrl)} alt={first.name} className="w-full h-full object-cover" />
                        : <span className="font-bold text-2xl">{first.name.charAt(0)}</span>}
                    </div>
                    <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-yellow-400 text-yellow-900 font-black text-xs flex items-center justify-center border-2 border-card">1</span>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-sm text-foreground truncate max-w-[140px]">{first.name.split(" ")[0]}</p>
                    <p className="text-xs text-yellow-600 font-bold">{(first.xp ?? 0).toLocaleString()} XP</p>
                  </div>
                  <div className="w-full h-20 bg-yellow-400/20 rounded-t-lg border border-yellow-400/30" />
                </div>

                {/* 3rd */}
                <div className="flex flex-col items-center gap-2 flex-1 max-w-[140px]">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center overflow-hidden border-2 border-amber-600">
                      {third.avatarUrl
                        ? <img src={resolveAvatarUrl(third.avatarUrl)} alt={third.name} className="w-full h-full object-cover" />
                        : <span className="font-bold text-xl">{third.name.charAt(0)}</span>}
                    </div>
                    <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-600 text-white font-black text-xs flex items-center justify-center border-2 border-card">3</span>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-xs text-foreground truncate max-w-[120px]">{third.name.split(" ")[0]}</p>
                    <p className="text-xs text-amber-600 font-bold">{(third.xp ?? 0).toLocaleString()} XP</p>
                  </div>
                  <div className="w-full h-8 bg-amber-600/20 rounded-t-lg border border-amber-600/30" />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Three leaderboard columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <LeaderboardCard
          title="XP Rankings"
          icon={<Zap className="w-4 h-4" />}
          iconColor="text-yellow-600"
          valueColor="text-yellow-600"
          barColor="bg-yellow-500"
          members={all}
          getValue={(m) => m.xp ?? 0}
          getLabel={(m) => `${(m.xp ?? 0).toLocaleString()} XP`}
          emptyMsg="No members yet"
        />
        <LeaderboardCard
          title="Medal Rankings"
          icon={<Trophy className="w-4 h-4" />}
          iconColor="text-orange-600"
          valueColor="text-orange-600"
          barColor="bg-orange-500"
          members={all}
          getValue={(m) => m.medalsEarned ?? 0}
          getLabel={(m) => `${m.medalsEarned ?? 0} 🏅`}
          emptyMsg="No medals awarded yet"
        />
        <LeaderboardCard
          title="Ring Rankings"
          icon={<CircleDot className="w-4 h-4" />}
          iconColor="text-purple-600"
          valueColor="text-purple-600"
          barColor="bg-purple-500"
          members={all}
          getValue={(m) => m.ringsEarned ?? 0}
          getLabel={(m) => `${m.ringsEarned ?? 0} 💍`}
          emptyMsg="No rings awarded yet"
        />
      </div>
    </div>
  );
}
