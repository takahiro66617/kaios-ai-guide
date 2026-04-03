import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ===== Types =====

export interface Person {
  id: string;
  name: string;
  department: string;
  role: string;
  yearsAtCompany: number;
  avatarInitial: string;
}

export interface KaizenItem {
  id: string;
  title: string;
  problem: string;
  cause: string;
  solution: string;
  effect: string;
  department: string;
  category: string;
  reproducibility: "高" | "中" | "低";
  tags: string[];
  status: "新規" | "構造化済み" | "ナレッジ登録済み" | "実行中" | "完了";
  authorId: string;
  createdAt: string;
  adoptedBy: string[];
  impactScore: number;
}

export interface EvalSettings {
  speed: number;
  crossFunctional: number;
}

// ===== People Data =====

export const PEOPLE: Person[] = [
  { id: "p1", name: "佐藤 美咲", department: "カスタマーサポート部", role: "チームリーダー", yearsAtCompany: 3, avatarInitial: "佐" },
  { id: "p2", name: "田中 花子", department: "情報システム部", role: "エンジニア", yearsAtCompany: 5, avatarInitial: "田" },
  { id: "p3", name: "鈴木 次郎", department: "営業部", role: "マネージャー", yearsAtCompany: 7, avatarInitial: "鈴" },
  { id: "p4", name: "高橋 美咲", department: "経営企画部", role: "主任", yearsAtCompany: 4, avatarInitial: "高" },
  { id: "p5", name: "山本 健一", department: "製造部", role: "現場リーダー", yearsAtCompany: 10, avatarInitial: "山" },
  { id: "p6", name: "中村 さくら", department: "経理部", role: "担当", yearsAtCompany: 2, avatarInitial: "中" },
  { id: "p7", name: "小林 大輔", department: "物流部", role: "係長", yearsAtCompany: 6, avatarInitial: "小" },
  { id: "p8", name: "加藤 裕子", department: "総務部", role: "担当", yearsAtCompany: 3, avatarInitial: "加" },
];

// Helper to map DB row to KaizenItem
const mapRowToItem = (row: any): KaizenItem => ({
  id: row.id,
  title: row.title,
  problem: row.problem,
  cause: row.cause,
  solution: row.solution,
  effect: row.effect,
  department: row.department,
  category: row.category,
  reproducibility: row.reproducibility as KaizenItem["reproducibility"],
  tags: row.tags || [],
  status: row.status as KaizenItem["status"],
  authorId: row.author_id,
  createdAt: row.created_at ? row.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
  adoptedBy: row.adopted_by || [],
  impactScore: row.impact_score || 0,
});

// ===== Context =====

interface KaiosContextType {
  people: Person[];
  kaizenItems: KaizenItem[];
  isLoading: boolean;
  evalSettings: EvalSettings;
  setEvalSettings: (s: EvalSettings) => void;
  addKaizenItem: (item: Omit<KaizenItem, "id" | "createdAt" | "adoptedBy" | "impactScore" | "status">) => KaizenItem;
  updateKaizenStatus: (id: string, status: KaizenItem["status"]) => void;
  getPersonById: (id: string) => Person | undefined;
  getKaizenByPerson: (personId: string) => KaizenItem[];
  getKaizenByDepartment: (dept: string) => KaizenItem[];
  calculateImpactScore: (item: KaizenItem) => number;
  refreshItems: () => Promise<void>;
}

const KaiosContext = createContext<KaiosContextType | null>(null);

export const useKaios = () => {
  const ctx = useContext(KaiosContext);
  if (!ctx) throw new Error("useKaios must be used within KaiosProvider");
  return ctx;
};

export const KaiosProvider = ({ children }: { children: React.ReactNode }) => {
  const [kaizenItems, setKaizenItems] = useState<KaizenItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [evalSettings, setEvalSettings] = useState<EvalSettings>({ speed: 70, crossFunctional: 85 });

  const refreshItems = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("kaizen_items" as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Failed to load kaizen items:", error);
        return;
      }

      if (data) {
        setKaizenItems((data as any[]).map(mapRowToItem));
      }
    } catch (e) {
      console.error("Error loading kaizen items:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshItems();
  }, [refreshItems]);

  const calculateImpactScore = useCallback((item: KaizenItem) => {
    const baseScore = 50;
    const speedBonus = evalSettings.speed * 0.15;
    const crossBonus = (item.adoptedBy.length * 8) * (evalSettings.crossFunctional / 100);
    const reproBonus = item.reproducibility === "高" ? 15 : item.reproducibility === "中" ? 8 : 0;
    return Math.min(100, Math.round(baseScore + speedBonus + crossBonus + reproBonus));
  }, [evalSettings]);

  const addKaizenItem = useCallback((item: Omit<KaizenItem, "id" | "createdAt" | "adoptedBy" | "impactScore" | "status">) => {
    const tempId = `temp-${Date.now()}`;
    const newItem: KaizenItem = {
      ...item,
      id: tempId,
      createdAt: new Date().toISOString().slice(0, 10),
      adoptedBy: [],
      impactScore: 0,
      status: "構造化済み",
    };
    newItem.impactScore = calculateImpactScore(newItem);

    // Optimistically add to state
    setKaizenItems(prev => [newItem, ...prev]);

    // Persist to DB async
    (async () => {
      try {
        const { data, error } = await supabase
          .from("kaizen_items" as any)
          .insert({
            title: item.title,
            problem: item.problem,
            cause: item.cause,
            solution: item.solution,
            effect: item.effect,
            department: item.department,
            category: item.category,
            reproducibility: item.reproducibility,
            tags: item.tags,
            status: "構造化済み",
            author_id: item.authorId,
            adopted_by: [],
            impact_score: newItem.impactScore,
          } as any)
          .select()
          .single();

        if (error) {
          console.error("Failed to save kaizen item:", error);
          toast.error("データベースへの保存に失敗しました");
          return;
        }

        if (data) {
          const dbItem = mapRowToItem(data);
          setKaizenItems(prev => prev.map(i => i.id === tempId ? dbItem : i));
        }
      } catch (e) {
        console.error("Error saving kaizen item:", e);
      }
    })();

    return newItem;
  }, [calculateImpactScore]);

  const updateKaizenStatus = useCallback((id: string, status: KaizenItem["status"]) => {
    setKaizenItems(prev => prev.map(item => item.id === id ? { ...item, status } : item));

    (async () => {
      try {
        const { error } = await supabase
          .from("kaizen_items" as any)
          .update({ status } as any)
          .eq("id", id);

        if (error) console.error("Failed to update status:", error);
      } catch (e) {
        console.error("Error updating status:", e);
      }
    })();
  }, []);

  const getPersonById = useCallback((id: string) => PEOPLE.find(p => p.id === id), []);
  const getKaizenByPerson = useCallback((personId: string) => kaizenItems.filter(k => k.authorId === personId), [kaizenItems]);
  const getKaizenByDepartment = useCallback((dept: string) => kaizenItems.filter(k => k.department === dept), [kaizenItems]);

  return (
    <KaiosContext.Provider value={{
      people: PEOPLE,
      kaizenItems,
      isLoading,
      evalSettings,
      setEvalSettings,
      addKaizenItem,
      updateKaizenStatus,
      getPersonById,
      getKaizenByPerson,
      getKaizenByDepartment,
      calculateImpactScore,
      refreshItems,
    }}>
      {children}
    </KaiosContext.Provider>
  );
};