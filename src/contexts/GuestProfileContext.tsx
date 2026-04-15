import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

// Level thresholds
const LEVEL_THRESHOLDS = [0, 50, 150, 300, 500, 750, 1050, 1400, 1800, 2500];
const LEVEL_TITLES = ["見習い", "改善ルーキー", "気づきの人", "改善リーダー", "変革の推進者", "改善マスター", "組織変革者", "改善エヴァンジェリスト", "レジェンド", "殿堂入り"];

export interface GuestProfile {
  id: string;
  guestId: string;
  displayName: string;
  level: number;
  xp: number;
  totalSubmissions: number;
  consecutiveDays: number;
  lastActiveDate: string | null;
}

export interface Mission {
  id: string;
  key: string;
  title: string;
  description: string;
  icon: string;
  xpReward: number;
  targetCount: number;
  category: string;
  sortOrder: number;
  isActive: boolean;
}

export interface MissionProgress {
  id: string;
  guestId: string;
  missionId: string;
  currentCount: number;
  isCompleted: boolean;
  completedAt: string | null;
}

export interface LikeInfo {
  kaizenItemId: string;
  count: number;
  likedByMe: boolean;
}

function getOrCreateGuestId(): string {
  const key = "kaios_guest_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = `guest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem(key, id);
  }
  return id;
}

function getLevelFromXp(xp: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) return i + 1;
  }
  return 1;
}

function getXpForNextLevel(level: number): number {
  if (level >= LEVEL_THRESHOLDS.length) return LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  return LEVEL_THRESHOLDS[level]; // next level threshold
}

function getXpForCurrentLevel(level: number): number {
  return LEVEL_THRESHOLDS[level - 1] || 0;
}

interface GuestProfileContextType {
  profile: GuestProfile | null;
  missions: Mission[];
  missionProgress: MissionProgress[];
  likes: LikeInfo[];
  isLoading: boolean;
  guestId: string;
  levelTitle: string;
  xpToNextLevel: number;
  xpInCurrentLevel: number;
  xpNeededForCurrentLevel: number;
  levelProgress: number; // 0-100
  addXp: (amount: number) => Promise<{ newLevel: number; oldLevel: number; xpGained: number }>;
  incrementSubmissions: () => Promise<void>;
  checkAndCompleteMissions: (context: { submissionCount: number; impactScore?: number; hasMultiDept?: boolean }) => Promise<Mission[]>;
  toggleLike: (kaizenItemId: string) => Promise<void>;
  getLikeInfo: (kaizenItemId: string) => LikeInfo;
  refreshProfile: () => Promise<void>;
  refreshLikes: () => Promise<void>;
  updateConsecutiveDays: () => Promise<void>;
}

const GuestProfileContext = createContext<GuestProfileContextType | null>(null);

export const useGuestProfile = () => {
  const ctx = useContext(GuestProfileContext);
  if (!ctx) throw new Error("useGuestProfile must be used within GuestProfileProvider");
  return ctx;
};

export { LEVEL_TITLES, LEVEL_THRESHOLDS, getLevelFromXp, getXpForNextLevel, getXpForCurrentLevel };

export const GuestProfileProvider = ({ children }: { children: React.ReactNode }) => {
  const [guestId] = useState(getOrCreateGuestId);
  const [profile, setProfile] = useState<GuestProfile | null>(null);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [missionProgress, setMissionProgress] = useState<MissionProgress[]>([]);
  const [likes, setLikes] = useState<LikeInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize or fetch profile
  const refreshProfile = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("guest_profiles")
        .select("*")
        .eq("guest_id", guestId)
        .maybeSingle();

      if (error) { console.error("Error fetching profile:", error); return; }

      if (data) {
        setProfile({
          id: data.id,
          guestId: data.guest_id,
          displayName: data.display_name,
          level: data.level,
          xp: data.xp,
          totalSubmissions: data.total_submissions,
          consecutiveDays: data.consecutive_days,
          lastActiveDate: data.last_active_date,
        });
      } else {
        // Create new profile
        const { data: newData, error: insertError } = await supabase
          .from("guest_profiles")
          .insert({ guest_id: guestId, display_name: "ゲスト", level: 1, xp: 0, total_submissions: 0, consecutive_days: 0 })
          .select()
          .single();
        if (!insertError && newData) {
          setProfile({
            id: newData.id,
            guestId: newData.guest_id,
            displayName: newData.display_name,
            level: newData.level,
            xp: newData.xp,
            totalSubmissions: newData.total_submissions,
            consecutiveDays: newData.consecutive_days,
            lastActiveDate: newData.last_active_date,
          });
        }
      }
    } catch (e) { console.error("Error initializing profile:", e); }
  }, [guestId]);

  const refreshMissions = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("missions")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (data) {
        setMissions(data.map((m: any) => ({
          id: m.id, key: m.key, title: m.title, description: m.description,
          icon: m.icon, xpReward: m.xp_reward, targetCount: m.target_count,
          category: m.category, sortOrder: m.sort_order, isActive: m.is_active,
        })));
      }
    } catch (e) { console.error("Error loading missions:", e); }
  }, []);

  const refreshMissionProgress = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("mission_progress")
        .select("*")
        .eq("guest_id", guestId);
      if (data) {
        setMissionProgress(data.map((p: any) => ({
          id: p.id, guestId: p.guest_id, missionId: p.mission_id,
          currentCount: p.current_count, isCompleted: p.is_completed,
          completedAt: p.completed_at,
        })));
      }
    } catch (e) { console.error("Error loading mission progress:", e); }
  }, [guestId]);

  const refreshLikes = useCallback(async () => {
    try {
      const { data } = await supabase.from("likes").select("*");
      if (data) {
        const likeMap = new Map<string, { count: number; likedByMe: boolean }>();
        data.forEach((l: any) => {
          const existing = likeMap.get(l.kaizen_item_id) || { count: 0, likedByMe: false };
          existing.count++;
          if (l.guest_id === guestId) existing.likedByMe = true;
          likeMap.set(l.kaizen_item_id, existing);
        });
        setLikes(Array.from(likeMap.entries()).map(([kaizenItemId, info]) => ({
          kaizenItemId, ...info,
        })));
      }
    } catch (e) { console.error("Error loading likes:", e); }
  }, [guestId]);

  useEffect(() => {
    Promise.all([refreshProfile(), refreshMissions(), refreshMissionProgress(), refreshLikes()])
      .finally(() => setIsLoading(false));
  }, [refreshProfile, refreshMissions, refreshMissionProgress, refreshLikes]);

  // Update consecutive days on visit
  const updateConsecutiveDays = useCallback(async () => {
    if (!profile) return;
    const today = new Date().toISOString().slice(0, 10);
    if (profile.lastActiveDate === today) return;

    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const newConsecutive = profile.lastActiveDate === yesterday ? profile.consecutiveDays + 1 : 1;

    await supabase.from("guest_profiles").update({
      last_active_date: today,
      consecutive_days: newConsecutive,
    }).eq("guest_id", guestId);

    setProfile(prev => prev ? { ...prev, lastActiveDate: today, consecutiveDays: newConsecutive } : prev);
  }, [profile, guestId]);

  useEffect(() => {
    if (profile) updateConsecutiveDays();
  }, [profile?.id]); // eslint-disable-line

  const addXp = useCallback(async (amount: number) => {
    if (!profile) return { newLevel: 1, oldLevel: 1, xpGained: amount };
    const oldLevel = profile.level;
    const newXp = profile.xp + amount;
    const newLevel = getLevelFromXp(newXp);

    await supabase.from("guest_profiles").update({ xp: newXp, level: newLevel }).eq("guest_id", guestId);
    setProfile(prev => prev ? { ...prev, xp: newXp, level: newLevel } : prev);

    return { newLevel, oldLevel, xpGained: amount };
  }, [profile, guestId]);

  const incrementSubmissions = useCallback(async () => {
    if (!profile) return;
    const newCount = profile.totalSubmissions + 1;
    await supabase.from("guest_profiles").update({ total_submissions: newCount }).eq("guest_id", guestId);
    setProfile(prev => prev ? { ...prev, totalSubmissions: newCount } : prev);
  }, [profile, guestId]);

  const checkAndCompleteMissions = useCallback(async (context: { submissionCount: number; impactScore?: number; hasMultiDept?: boolean }) => {
    const completed: Mission[] = [];

    for (const mission of missions) {
      const progress = missionProgress.find(p => p.missionId === mission.id);
      if (progress?.isCompleted) continue;

      let newCount = 0;
      let shouldComplete = false;

      switch (mission.key) {
        case "first_submission":
          newCount = Math.min(context.submissionCount, 1);
          shouldComplete = context.submissionCount >= 1;
          break;
        case "submit_3":
          newCount = Math.min(context.submissionCount, 3);
          shouldComplete = context.submissionCount >= 3;
          break;
        case "submit_5":
          newCount = Math.min(context.submissionCount, 5);
          shouldComplete = context.submissionCount >= 5;
          break;
        case "submit_10":
          newCount = Math.min(context.submissionCount, 10);
          shouldComplete = context.submissionCount >= 10;
          break;
        case "high_impact":
          if (context.impactScore && context.impactScore >= 80) {
            newCount = 1;
            shouldComplete = true;
          }
          break;
        case "multi_department":
          if (context.hasMultiDept) {
            newCount = 1;
            shouldComplete = true;
          }
          break;
        case "consecutive_3":
          newCount = Math.min(profile?.consecutiveDays || 0, 3);
          shouldComplete = (profile?.consecutiveDays || 0) >= 3;
          break;
      }

      if (progress) {
        await supabase.from("mission_progress").update({
          current_count: newCount,
          is_completed: shouldComplete,
          completed_at: shouldComplete ? new Date().toISOString() : null,
        }).eq("id", progress.id);
      } else {
        await supabase.from("mission_progress").insert({
          guest_id: guestId,
          mission_id: mission.id,
          current_count: newCount,
          is_completed: shouldComplete,
          completed_at: shouldComplete ? new Date().toISOString() : null,
        });
      }

      if (shouldComplete && !progress?.isCompleted) {
        completed.push(mission);
      }
    }

    await refreshMissionProgress();
    return completed;
  }, [missions, missionProgress, profile, guestId, refreshMissionProgress]);

  const toggleLike = useCallback(async (kaizenItemId: string) => {
    const existing = likes.find(l => l.kaizenItemId === kaizenItemId);
    if (existing?.likedByMe) {
      await supabase.from("likes").delete().eq("guest_id", guestId).eq("kaizen_item_id", kaizenItemId);
    } else {
      await supabase.from("likes").insert({ guest_id: guestId, kaizen_item_id: kaizenItemId });
    }
    await refreshLikes();
  }, [guestId, likes, refreshLikes]);

  const getLikeInfo = useCallback((kaizenItemId: string): LikeInfo => {
    return likes.find(l => l.kaizenItemId === kaizenItemId) || { kaizenItemId, count: 0, likedByMe: false };
  }, [likes]);

  const currentLevel = profile?.level || 1;
  const currentXp = profile?.xp || 0;
  const xpForCurrent = getXpForCurrentLevel(currentLevel);
  const xpForNext = getXpForNextLevel(currentLevel);
  const xpInCurrentLevel = currentXp - xpForCurrent;
  const xpNeededForCurrentLevel = xpForNext - xpForCurrent;
  const levelProgress = xpNeededForCurrentLevel > 0 ? Math.min(100, Math.round((xpInCurrentLevel / xpNeededForCurrentLevel) * 100)) : 100;
  const levelTitle = LEVEL_TITLES[Math.min(currentLevel - 1, LEVEL_TITLES.length - 1)];

  return (
    <GuestProfileContext.Provider value={{
      profile, missions, missionProgress, likes, isLoading, guestId,
      levelTitle, xpToNextLevel: xpForNext - currentXp,
      xpInCurrentLevel, xpNeededForCurrentLevel, levelProgress,
      addXp, incrementSubmissions, checkAndCompleteMissions,
      toggleLike, getLikeInfo, refreshProfile, refreshLikes, updateConsecutiveDays,
    }}>
      {children}
    </GuestProfileContext.Provider>
  );
};
