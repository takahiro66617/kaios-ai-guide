import { motion } from "framer-motion";
import { Target, CheckCircle2, Lock, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useGuestProfile } from "@/contexts/GuestProfileContext";

const MissionsPage = () => {
  const { missions, missionProgress, profile } = useGuestProfile();

  const completedCount = missionProgress.filter(p => p.isCompleted).length;

  const categorized = {
    milestone: missions.filter(m => m.category === "milestone"),
    quality: missions.filter(m => m.category === "quality"),
    engagement: missions.filter(m => m.category === "engagement"),
  };

  const categoryLabels: Record<string, { label: string; icon: string }> = {
    milestone: { label: "提出マイルストーン", icon: "🏆" },
    quality: { label: "品質チャレンジ", icon: "💎" },
    engagement: { label: "エンゲージメント", icon: "🔥" },
  };

  return (
    <main className="flex-1 bg-kaios-surface overflow-auto">
      <div className="p-4 sm:p-6 max-w-[900px] mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Target className="w-6 h-6 text-primary" />
            ミッション一覧
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            ミッションをクリアしてXPを獲得し、レベルアップしよう！
          </p>
        </div>

        {/* Summary */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {completedCount} / {missions.length} ミッション達成
                </p>
                <p className="text-xs text-muted-foreground">
                  獲得済みXP: {missionProgress.filter(p => p.isCompleted).reduce((sum, p) => {
                    const m = missions.find(mi => mi.id === p.missionId);
                    return sum + (m?.xpReward || 0);
                  }, 0)}XP
                </p>
              </div>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{Math.round((completedCount / Math.max(missions.length, 1)) * 100)}%</p>
              <p className="text-xs text-muted-foreground">達成率</p>
            </div>
          </CardContent>
        </Card>

        {/* Mission Categories */}
        {Object.entries(categorized).map(([category, categoryMissions]) => {
          if (categoryMissions.length === 0) return null;
          const info = categoryLabels[category];
          return (
            <div key={category} className="space-y-3">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <span>{info.icon}</span> {info.label}
              </h2>
              <div className="space-y-2">
                {categoryMissions.map((mission, index) => {
                  const progress = missionProgress.find(p => p.missionId === mission.id);
                  const isCompleted = progress?.isCompleted || false;
                  const currentCount = progress?.currentCount || 0;
                  const pct = mission.targetCount > 0 ? Math.round((currentCount / mission.targetCount) * 100) : 0;

                  return (
                    <motion.div
                      key={mission.id}
                      initial={{ x: -10, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className={`transition-colors ${isCompleted ? "border-kaios-success/30 bg-kaios-success/5" : ""}`}>
                        <CardContent className="p-4 flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 ${
                            isCompleted ? "bg-kaios-success/20" : "bg-muted"
                          }`}>
                            {isCompleted ? <CheckCircle2 className="w-6 h-6 text-kaios-success" /> : mission.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className={`text-sm font-medium ${isCompleted ? "text-kaios-success line-through" : "text-foreground"}`}>
                                {mission.title}
                              </p>
                              {isCompleted && <Badge className="bg-kaios-success/20 text-kaios-success border-kaios-success/30 text-xs">達成</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{mission.description}</p>
                            {!isCompleted && (
                              <div className="flex items-center gap-2 mt-2">
                                <Progress value={pct} className="h-1.5 flex-1" />
                                <span className="text-xs text-muted-foreground">{currentCount}/{mission.targetCount}</span>
                              </div>
                            )}
                            {isCompleted && progress?.completedAt && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(progress.completedAt).toLocaleDateString("ja-JP")} に達成
                              </p>
                            )}
                          </div>
                          <Badge variant={isCompleted ? "secondary" : "outline"} className="text-xs shrink-0">
                            {isCompleted ? "✅" : ""} +{mission.xpReward}XP
                          </Badge>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
};

export default MissionsPage;
