import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Person {
  id: string;
  name: string;
  department: string;
  role: string;
  yearsAtCompany: number;
  avatarInitial: string;
  isActive: boolean;
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
  occurrencePlace: string;
  frequency: string;
  numericalEvidence: string;
}

export interface EvalSettings {
  speed: number;
  crossFunctional: number;
  reproducibilityWeight: number;
  costEfficiency: number;
  innovation: number;
}

const mapRowToPerson = (row: any): Person => ({
  id: row.id,
  name: row.name,
  department: row.department,
  role: row.role || "",
  yearsAtCompany: row.years_at_company || 1,
  avatarInitial: row.avatar_initial || row.name?.charAt(0) || "?",
  isActive: row.is_active ?? true,
});

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
  occurrencePlace: row.occurrence_place || "",
  frequency: row.frequency || "",
  numericalEvidence: row.numerical_evidence || "",
});

interface KaiosContextType {
  people: Person[];
  kaizenItems: KaizenItem[];
  isLoading: boolean;
  evalSettings: EvalSettings;
  setEvalSettings: (s: EvalSettings) => void;
  addKaizenItem: (item: Omit<KaizenItem, "id" | "createdAt" | "impactScore" | "status"> & { adoptedBy?: string[] }) => Promise<KaizenItem | null>;
  updateKaizenStatus: (id: string, status: KaizenItem["status"]) => void;
  getPersonById: (id: string) => Person | undefined;
  getKaizenByPerson: (personId: string) => KaizenItem[];
  getKaizenByDepartment: (dept: string) => KaizenItem[];
  calculateImpactScore: (item: KaizenItem) => number;
  refreshItems: () => Promise<void>;
  refreshPeople: () => Promise<void>;
  addPerson: (person: Omit<Person, "id" | "isActive">) => Promise<Person | null>;
  updatePerson: (id: string, updates: Partial<Person>) => Promise<void>;
  deletePerson: (id: string) => Promise<void>;
}

const KaiosContext = createContext<KaiosContextType | null>(null);

export const useKaios = () => {
  const ctx = useContext(KaiosContext);
  if (!ctx) throw new Error("useKaios must be used within KaiosProvider");
  return ctx;
};

export const KaiosProvider = ({ children }: { children: React.ReactNode }) => {
  const [people, setPeople] = useState<Person[]>([]);
  const [kaizenItems, setKaizenItems] = useState<KaizenItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [evalSettings, setEvalSettings] = useState<EvalSettings>({
    speed: 50,
    crossFunctional: 50,
    reproducibilityWeight: 50,
    costEfficiency: 50,
    innovation: 50,
  });

  const refreshEvalSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("eval_settings")
        .select("*")
        .limit(1)
        .single();
      if (!error && data) {
        setEvalSettings({
          speed: (data as any).speed ?? 50,
          crossFunctional: (data as any).cross_functional ?? 50,
          reproducibilityWeight: (data as any).reproducibility_weight ?? 50,
          costEfficiency: (data as any).cost_efficiency ?? 50,
          innovation: (data as any).innovation ?? 50,
        });
      }
    } catch (e) {
      console.error("Error loading eval settings:", e);
    }
  }, []);

  const refreshPeople = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("people")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) {
        console.error("Failed to load people:", error);
        return;
      }
      if (data) setPeople((data as any[]).map(mapRowToPerson));
    } catch (e) {
      console.error("Error loading people:", e);
    }
  }, []);

  const refreshItems = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("kaizen_items")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Failed to load kaizen items:", error);
        return;
      }
      if (data) setKaizenItems((data as any[]).map(mapRowToItem));
    } catch (e) {
      console.error("Error loading kaizen items:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.all([refreshPeople(), refreshItems(), refreshEvalSettings()]);
  }, [refreshPeople, refreshItems, refreshEvalSettings]);

  const calculateImpactScore = useCallback((item: KaizenItem) => {
    const baseScore = 30;
    const speedBonus = evalSettings.speed * 0.1;
    const crossBonus = (item.adoptedBy.length * 6) * (evalSettings.crossFunctional / 100);
    const reproBonus = item.reproducibility === "高"
      ? evalSettings.reproducibilityWeight * 0.2
      : item.reproducibility === "中"
        ? evalSettings.reproducibilityWeight * 0.1
        : 0;
    const costBonus = evalSettings.costEfficiency * 0.08;
    const innoBonus = evalSettings.innovation * 0.07;
    return Math.min(100, Math.round(baseScore + speedBonus + crossBonus + reproBonus + costBonus + innoBonus));
  }, [evalSettings]);

  const addKaizenItem = useCallback(async (
    item: Omit<KaizenItem, "id" | "createdAt" | "impactScore" | "status"> & { adoptedBy?: string[] }
  ): Promise<KaizenItem | null> => {
    const adoptedBy = item.adoptedBy || [];
    const registeredItem: KaizenItem = {
      ...item,
      id: `temp-${Date.now()}`,
      createdAt: new Date().toISOString().slice(0, 10),
      adoptedBy,
      impactScore: 0,
      status: "ナレッジ登録済み",
    };
    registeredItem.impactScore = calculateImpactScore(registeredItem);

    try {
      const { data, error } = await supabase
        .from("kaizen_items")
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
          status: "ナレッジ登録済み",
          author_id: item.authorId,
          adopted_by: adoptedBy,
          impact_score: registeredItem.impactScore,
          occurrence_place: item.occurrencePlace || "",
          frequency: item.frequency || "",
          numerical_evidence: item.numericalEvidence || "",
        } as any)
        .select()
        .single();

      if (error) {
        console.error("Failed to save kaizen item:", error);
        toast.error("データベースへの保存に失敗しました");
        return null;
      }

      if (data) {
        const dbItem = mapRowToItem(data);
        setKaizenItems(prev => [dbItem, ...prev.filter(i => i.id !== dbItem.id)]);
        return dbItem;
      }

      return null;
    } catch (e) {
      console.error("Error saving kaizen item:", e);
      toast.error("データベースへの保存に失敗しました");
      return null;
    }
  }, [calculateImpactScore]);

  const updateKaizenStatus = useCallback((id: string, status: KaizenItem["status"]) => {
    setKaizenItems(prev => prev.map(item => item.id === id ? { ...item, status } : item));
    (async () => {
      try {
        const { error } = await supabase.from("kaizen_items").update({ status }).eq("id", id);
        if (error) console.error("Failed to update status:", error);
      } catch (e) {
        console.error("Error updating status:", e);
      }
    })();
  }, []);

  const addPerson = useCallback(async (person: Omit<Person, "id" | "isActive">): Promise<Person | null> => {
    try {
      const { data, error } = await supabase
        .from("people")
        .insert({
          name: person.name,
          department: person.department,
          role: person.role,
          years_at_company: person.yearsAtCompany,
          avatar_initial: person.avatarInitial,
        })
        .select()
        .single();
      if (error) {
        console.error("Failed to add person:", error);
        toast.error("提案者の追加に失敗しました");
        return null;
      }
      if (data) {
        const newPerson = mapRowToPerson(data);
        setPeople(prev => [...prev, newPerson]);
        return newPerson;
      }
      return null;
    } catch (e) {
      console.error("Error adding person:", e);
      return null;
    }
  }, []);

  const updatePerson = useCallback(async (id: string, updates: Partial<Person>) => {
    try {
      const dbUpdates: any = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.department !== undefined) dbUpdates.department = updates.department;
      if (updates.role !== undefined) dbUpdates.role = updates.role;
      if (updates.yearsAtCompany !== undefined) dbUpdates.years_at_company = updates.yearsAtCompany;
      if (updates.avatarInitial !== undefined) dbUpdates.avatar_initial = updates.avatarInitial;
      if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
      const { error } = await supabase.from("people").update(dbUpdates).eq("id", id);
      if (error) {
        console.error("Failed to update person:", error);
        toast.error("提案者の更新に失敗しました");
        return;
      }
      setPeople(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    } catch (e) {
      console.error("Error updating person:", e);
    }
  }, []);

  const deletePerson = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from("people").delete().eq("id", id);
      if (error) {
        console.error("Failed to delete person:", error);
        toast.error("提案者の削除に失敗しました");
        return;
      }
      setPeople(prev => prev.filter(p => p.id !== id));
    } catch (e) {
      console.error("Error deleting person:", e);
    }
  }, []);

  const getPersonById = useCallback((id: string) => people.find(p => p.id === id), [people]);
  const getKaizenByPerson = useCallback((personId: string) => kaizenItems.filter(k => k.authorId === personId), [kaizenItems]);
  const getKaizenByDepartment = useCallback((dept: string) => kaizenItems.filter(k => k.department === dept), [kaizenItems]);

  return (
    <KaiosContext.Provider value={{
      people,
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
      refreshPeople,
      addPerson,
      updatePerson,
      deletePerson,
    }}>
      {children}
    </KaiosContext.Provider>
  );
};
