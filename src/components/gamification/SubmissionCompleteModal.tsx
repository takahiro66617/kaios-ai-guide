import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Star, ArrowRight, Sparkles, Zap, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useGuestProfile, LEVEL_TITLES } from "@/contexts/GuestProfileContext";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface SubmissionCompleteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  impactScore: number;
  xpGained: number;
  oldLevel: number;
  newLevel: number;
  completedMissions: { title: string; icon: string; xpReward: number }[];
  onGoToDashboard: () => void;
  onSubmitAnother: () => void;
}

const SubmissionCompleteModal = ({
  open, onOpenChange, impactScore, xpGained, oldLevel, newLevel,
  completedMissions, onGoToDashboard, onSubmitAnother,
}: SubmissionCompleteModalProps) => {
  const { levelProgress, xpToNextLevel, profile } = useGuestProfile();
  const [animatedScore, setAnimatedScore] = useState(0);
  const [animatedXp, setAnimatedXp] = useState(0);
  const leveledUp = newLevel > oldLevel;

  useEffect(() => {
    if (!open) { setAnimatedScore(0); setAnimatedXp(0); return; }
    const scoreTimer = setInterval(() => {
      setAnimatedScore(prev => {
        if (prev >= impactScore) { clearInterval(scoreTimer); return impactScore; }
        return prev + Math.max(1, Math.floor((impactScore - prev) / 10));
      });
    }, 30);
    const xpTimer = setTimeout(() => {
      const t = setInterval(() => {
        setAnimatedXp(prev => {
          if (prev >= xpGained) { clearInterval(t); return xpGained; }
          return prev + Math.max(1, Math.floor((xpGained - prev) / 8));
        });
      }, 40);
    }, 500);
    return () => { clearInterval(scoreTimer); clearTimeout(xpTimer); };
  }, [open, impactScore, xpGained]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-0 bg-transparent shadow-none [&>button]:hidden">
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="bg-card rounded-2xl border border-border shadow-2xl overflow-hidden"
            >
              {/* Header with celebration */}
              <div className="relative bg-gradient-to-br from-primary via-primary/90 to-primary/70 p-8 text-center overflow-hidden">
                <motion.div
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="mx-auto w-16 h-16 rounded-full bg-primary-foreground/20 flex items-center justify-center mb-3"
                >
                  <Trophy className="w-8 h-8 text-primary-foreground" />
                </motion.div>
                <motion.h2
                  initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-xl font-bold text-primary-foreground"
                >
                  改善提出完了！
                </motion.h2>
                <motion.p
                  initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-primary-foreground/80 text-sm mt-1"
                >
                  あなたの改善が組織を変えます
                </motion.p>
                {/* Floating particles */}
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ y: 100, x: Math.random() * 200 - 100, opacity: 0 }}
                    animate={{ y: -20, opacity: [0, 1, 0] }}
                    transition={{ delay: 0.5 + i * 0.15, duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
                    className="absolute text-lg"
                  >
                    {["✨", "⭐", "🎯", "💡", "🔥", "🚀"][i]}
                  </motion.div>
                ))}
              </div>

              <div className="p-6 space-y-5">
                {/* Score display */}
                <div className="flex items-center justify-center gap-8">
                  <motion.div
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    transition={{ delay: 0.5, type: "spring" }}
                    className="text-center"
                  >
                    <p className="text-xs text-muted-foreground mb-1">インパクトスコア</p>
                    <p className="text-4xl font-bold text-primary">{animatedScore}<span className="text-lg">pt</span></p>
                  </motion.div>
                  <motion.div
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    transition={{ delay: 0.7, type: "spring" }}
                    className="text-center"
                  >
                    <p className="text-xs text-muted-foreground mb-1">獲得XP</p>
                    <p className="text-4xl font-bold text-kaios-success">+{animatedXp}<span className="text-lg">XP</span></p>
                  </motion.div>
                </div>

                {/* Level up celebration */}
                {leveledUp && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    transition={{ delay: 1 }}
                    className="bg-gradient-to-r from-yellow-500/10 via-orange-500/10 to-red-500/10 border border-yellow-500/30 rounded-xl p-4 text-center"
                  >
                    <motion.div
                      animate={{ rotate: [0, -10, 10, -10, 0] }}
                      transition={{ delay: 1.2, duration: 0.5 }}
                    >
                      <Star className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                    </motion.div>
                    <p className="font-bold text-foreground">🎉 レベルアップ！</p>
                    <p className="text-sm text-muted-foreground">
                      Lv.{oldLevel} → <span className="text-primary font-bold">Lv.{newLevel}</span>
                    </p>
                    <p className="text-xs text-primary mt-1">「{LEVEL_TITLES[newLevel - 1]}」の称号を獲得！</p>
                  </motion.div>
                )}

                {/* Level progress bar */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.2 }}
                >
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                    <span>Lv.{profile?.level} {LEVEL_TITLES[(profile?.level || 1) - 1]}</span>
                    <span>次のレベルまで {xpToNextLevel}XP</span>
                  </div>
                  <Progress value={levelProgress} className="h-3" />
                </motion.div>

                {/* Completed missions */}
                {completedMissions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    transition={{ delay: 1.5 }}
                    className="space-y-2"
                  >
                    <p className="text-xs font-bold text-foreground flex items-center gap-1">
                      <Target className="w-3.5 h-3.5 text-primary" />
                      ミッション達成！
                    </p>
                    {completedMissions.map((m, i) => (
                      <motion.div
                        key={i}
                        initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 1.6 + i * 0.2 }}
                        className="flex items-center gap-3 p-2 rounded-lg bg-kaios-success/10 border border-kaios-success/20"
                      >
                        <span className="text-xl">{m.icon}</span>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground">{m.title}</p>
                        </div>
                        <span className="text-xs font-bold text-kaios-success">+{m.xpReward}XP</span>
                      </motion.div>
                    ))}
                  </motion.div>
                )}

                {/* Action buttons */}
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  transition={{ delay: 1.8 }}
                  className="flex gap-3 pt-2"
                >
                  <Button variant="outline" className="flex-1 gap-1.5" onClick={onSubmitAnother}>
                    <Sparkles className="w-4 h-4" />
                    もう1件提出する
                  </Button>
                  <Button className="flex-1 gap-1.5" onClick={onGoToDashboard}>
                    ダッシュボードへ
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};

export default SubmissionCompleteModal;
