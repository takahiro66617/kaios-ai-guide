import { useMemo } from "react";
import { motion } from "framer-motion";
import { Sparkles, Zap, Target, ArrowRight, Lightbulb, TrendingUp, Award, Flame, ChevronRight, Heart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useGuestProfile, LEVEL_TITLES } from "@/contexts/GuestProfileContext";
import { useKaios } from "@/contexts/KaiosContext";
import { useNavigate } from "react-router-dom";

const DashboardPage = () => {
  const { profile, missions, missionProgress, levelTitle, levelProgress, xpToNextLevel, xpInCurrentLevel, xpNeededForCurrentLevel, getLikeInfo } = useGuestProfile();
  const { kaizenItems } = useKaios();
  const navigate = useNavigate();

  const level = profile?.level || 1;
  const xp = profile?.xp || 0;
  const totalSubmissions = profile?.totalSubmissions || 0;
  const consecutiveDays = profile?.consecutiveDays || 0;

  // Next uncompleted missions
  const nextMissions = useMemo(() => {
    return missions
      .filter(m => {
        const progress = missionProgress.find(p => p.missionId === m.id);
        return !progress?.isCompleted;
      })
      .slice(0, 3);
  }, [missions, missionProgress]);

  // Completed missions count
  const completedCount = missionProgress.filter(p => p.isCompleted).length;

  // Recent items
  const recentItems = kaizenItems.slice(0, 3);

  // Top liked items
  const topItems = useMemo(() => {
    return [...kaizenItems]
      .map(item => ({ ...item, likeInfo: getLikeInfo(item.id) }))
      .sort((a, b) => b.likeInfo.count - a.likeInfo.count)
      .filter(i => i.likeInfo.count > 0)
      .slice(0, 3);
  }, [kaizenItems, getLikeInfo]);

  // Determine "today's action"
  const todayAction = useMemo(() => {
    if (totalSubmissions === 0) return { text: "最初の改善提案を提出しよう！", cta: "改善を提出する", path: "/kaizen-input" };
    const nextMission = nextMissions[0];
    if (nextMission) return { text: `ミッション「${nextMission.title}」に挑戦しよう！`, cta: "改善を提出する", path: "/kaizen-input" };
    return { text: "新しい改善アイデアを提出しよう！", cta: "改善を提出する", path: "/kaizen-input" };
  }, [totalSubmissions, nextMissions]);

  return (
    <main className="flex-1 bg-kaios-surface overflow-auto">
      <div className="p-4 sm:p-6 max-w-[1100px] mx-auto space-y-6">
        {/* Welcome + Level Card */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.4 }}>
          <Card className="overflow-hidden border-0 shadow-lg">
            <div className="bg-gradient-to-br from-primary via-primary/90 to-primary/70 p-6 text-primary-foreground">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-primary-foreground/70 text-sm">おかえりなさい！</p>
                  <h1 className="text-2xl font-bold mt-1">Lv.{level} {levelTitle}</h1>
                  <div className="flex items-center gap-3 mt-2 text-sm text-primary-foreground/80">
                    <span className="flex items-center gap-1"><Zap className="w-4 h-4" />{xp} XP</span>
                    <span className="flex items-center gap-1"><Target className="w-4 h-4" />{totalSubmissions}件提出</span>
                    {consecutiveDays > 0 && (
                      <span className="flex items-center gap-1"><Flame className="w-4 h-4 text-orange-300" />{consecutiveDays}日連続</span>
                    )}
                  </div>
                </div>
                <motion.div
                  initial={{ scale: 0.8 }} animate={{ scale: 1 }}
                  className="w-20 h-20 rounded-full bg-primary-foreground/20 flex items-center justify-center border-4 border-primary-foreground/30 shrink-0"
                >
                  <span className="text-3xl font-bold">{level}</span>
                </motion.div>
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-primary-foreground/70 mb-1.5">
                  <span>Lv.{level}</span>
                  <span>次のレベルまで {xpToNextLevel}XP</span>
                  <span>Lv.{level + 1}</span>
                </div>
                <div className="w-full h-3 rounded-full bg-primary-foreground/20 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${levelProgress}%` }}
                    transition={{ duration: 1, delay: 0.3 }}
                    className="h-full bg-primary-foreground/80 rounded-full"
                  />
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Today's Action CTA */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }}>
          <Card className="border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer" onClick={() => navigate(todayAction.path)}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <Lightbulb className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-primary mb-0.5">🎯 今日やること</p>
                <p className="text-sm font-medium text-foreground">{todayAction.text}</p>
              </div>
              <Button size="sm" className="gap-1 shrink-0">
                {todayAction.cta}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Missions */}
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25 }}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  ミッション
                  <Badge variant="secondary" className="text-xs">{completedCount}/{missions.length}</Badge>
                </CardTitle>
                <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => navigate("/missions")}>
                  すべて見る <ChevronRight className="w-3 h-3" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {nextMissions.length > 0 ? nextMissions.map((mission) => {
                  const progress = missionProgress.find(p => p.missionId === mission.id);
                  const pct = mission.targetCount > 0 ? Math.round(((progress?.currentCount || 0) / mission.targetCount) * 100) : 0;
                  return (
                    <div key={mission.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background hover:bg-muted/30 transition-colors">
                      <span className="text-2xl">{mission.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{mission.title}</p>
                        <p className="text-xs text-muted-foreground">{mission.description}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <Progress value={pct} className="h-1.5 flex-1" />
                          <span className="text-xs text-muted-foreground">{progress?.currentCount || 0}/{mission.targetCount}</span>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs shrink-0">+{mission.xpReward}XP</Badge>
                    </div>
                  );
                }) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <Award className="w-8 h-8 mx-auto mb-2 text-primary/30" />
                    <p className="text-sm">全ミッション達成！おめでとう！🎉</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Stats / Quick Actions */}
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.35 }}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  あなたの実績
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg border border-border bg-background text-center">
                    <p className="text-2xl font-bold text-primary">{totalSubmissions}</p>
                    <p className="text-xs text-muted-foreground">提出件数</p>
                  </div>
                  <div className="p-3 rounded-lg border border-border bg-background text-center">
                    <p className="text-2xl font-bold text-kaios-success">{xp}</p>
                    <p className="text-xs text-muted-foreground">累計XP</p>
                  </div>
                  <div className="p-3 rounded-lg border border-border bg-background text-center">
                    <p className="text-2xl font-bold text-foreground">{completedCount}</p>
                    <p className="text-xs text-muted-foreground">ミッション達成</p>
                  </div>
                  <div className="p-3 rounded-lg border border-border bg-background text-center">
                    <p className="text-2xl font-bold text-orange-500">{consecutiveDays}</p>
                    <p className="text-xs text-muted-foreground">連続アクセス日数</p>
                  </div>
                </div>

                <div className="border-t border-border pt-4 space-y-2">
                  <p className="text-xs font-bold text-muted-foreground">クイックアクション</p>
                  <Button variant="outline" className="w-full justify-start gap-2" onClick={() => navigate("/kaizen-input")}>
                    <Lightbulb className="w-4 h-4 text-primary" />
                    改善を提出する
                  </Button>
                  <Button variant="outline" className="w-full justify-start gap-2" onClick={() => navigate("/similar-cases")}>
                    <Sparkles className="w-4 h-4 text-primary" />
                    類似事例を探す
                  </Button>
                  <Button variant="outline" className="w-full justify-start gap-2" onClick={() => navigate("/impact")}>
                    <TrendingUp className="w-4 h-4 text-primary" />
                    インパクトを確認する
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Recent Activity */}
        {recentItems.length > 0 && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.45 }}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  最近の改善提案
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {recentItems.map((item) => {
                  const likeInfo = getLikeInfo(item.id);
                  return (
                    <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span>{item.department}</span>
                          <span>{item.createdAt}</span>
                          <Badge variant="secondary" className="text-xs">{item.status}</Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {likeInfo.count > 0 && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Heart className="w-3 h-3" />{likeInfo.count}
                          </span>
                        )}
                        <span className="text-sm font-bold text-primary">{item.impactScore}pt</span>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Top Liked - social proof */}
        {topItems.length > 0 && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.55 }}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Heart className="w-5 h-5 text-destructive" />
                  注目の改善提案
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {topItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-destructive/5 hover:bg-destructive/10 transition-colors cursor-pointer" onClick={() => navigate("/similar-cases")}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.department} ・ {item.category}</p>
                    </div>
                    <span className="flex items-center gap-1 text-sm font-bold text-destructive">
                      <Heart className="w-4 h-4 fill-current" />{item.likeInfo.count}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </main>
  );
};

export default DashboardPage;
