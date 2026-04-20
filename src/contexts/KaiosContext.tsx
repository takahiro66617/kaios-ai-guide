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
  userId: string | null;
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
  status: KaizenStatus;
  authorId: string;
  authorNameSnapshot: string;
  createdAt: string;
  adoptedBy: string[];
  impactScore: number;
  occurrencePlace: string;
  frequency: string;
  numericalEvidence: string;
  executionStage: "提案中" | "実行予定" | "実行済み";
  stageChangedAt: string | null;
  stageChangedBy: string | null;
  adminMemo: string;
  authorNote: string;
}

export type KaizenStatus = "下書き" | "申請中" | "承認済み" | "差戻し";
export const KAIZEN_STATUSES: KaizenStatus[] = ["下書き", "申請中", "承認済み", "差戻し"];

export type ExecutionStage = "提案中" | "実行予定" | "実行済み";
export const EXECUTION_STAGES: ExecutionStage[] = ["提案中", "実行予定", "実行済み"];

export interface StageHistoryEntry {
  id: string;
  kaizenItemId: string;
  fromStage: string | null;
  toStage: string;
  changedBy: string;
  reason: string | null;
  createdAt: string;
}

export interface EvalAxis {
  id: string;
  name: string;
  key: string;
  description: string;
  tooltip: string;
  leftLabel: string;
  rightLabel: string;
  defaultValue: number;
  weight: number;
  sortOrder: number;
  isActive: boolean;
}

const mapRowToPerson = (row: any): Person => ({
  id: row.id,
  name: row.name,
  department: row.department,
  role: row.role || "",
  yearsAtCompany: row.years_at_company || 1,
  avatarInitial: row.avatar_initial || row.name?.charAt(0) || "?",
  isActive: row.is_active ?? true,
  userId: row.user_id ?? null,
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
  status: (row.status as KaizenStatus) || "下書き",
  authorId: row.author_id,
  authorNameSnapshot: row.author_name_snapshot || "",
  createdAt: row.created_at ? row.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
  adoptedBy: row.adopted_by || [],
  impactScore: row.impact_score || 0,
  occurrencePlace: row.occurrence_place || "",
  frequency: row.frequency || "",
  numericalEvidence: row.numerical_evidence || "",
  executionStage: (row.execution_stage as KaizenItem["executionStage"]) || "提案中",
  stageChangedAt: row.stage_changed_at || null,
  stageChangedBy: row.stage_changed_by || null,
  adminMemo: row.admin_memo || "",
  authorNote: row.author_note || "",
});

const mapRowToAxis = (row: any): EvalAxis => ({
  id: row.id,
  name: row.name,
  key: row.key,
  description: row.description || "",
  tooltip: row.tooltip || "",
  leftLabel: row.left_label || "低 (0%)",
  rightLabel: row.right_label || "高 (100%)",
  defaultValue: row.default_value ?? 50,
  weight: row.weight ?? 50,
  sortOrder: row.sort_order ?? 0,
  isActive: row.is_active ?? true,
});

interface KaiosContextType {
  people: Person[];
  kaizenItems: KaizenItem[];
  isLoading: boolean;
  evalAxes: EvalAxis[];
  refreshEvalAxes: () => Promise<void>;
  addEvalAxis: (axis: Omit<EvalAxis, "id" | "isActive">) => Promise<EvalAxis | null>;
  updateEvalAxis: (id: string, updates: Partial<EvalAxis>) => Promise<void>;
  deleteEvalAxis: (id: string) => Promise<void>;
  updateAxisWeight: (id: string, weight: number) => void;
  addKaizenItem: (item: Omit<KaizenItem, "id" | "createdAt" | "impactScore" | "status" | "executionStage" | "stageChangedAt" | "stageChangedBy" | "adminMemo"> & { adoptedBy?: string[] }) => Promise<KaizenItem | null>;
  updateKaizenStatus: (id: string, status: KaizenItem["status"]) => void;
  updateExecutionStage: (id: string, stage: ExecutionStage, changedBy?: string, reason?: string) => Promise<void>;
  updateAdminMemo: (id: string, memo: string) => Promise<void>;
  getStageHistory: (kaizenItemId: string) => Promise<StageHistoryEntry[]>;
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
  const [evalAxes, setEvalAxes] = useState<EvalAxis[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshEvalAxes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("eval_axes")
        .select("*")
        .order("sort_order", { ascending: true });
      if (!error && data) {
        setEvalAxes((data as any[]).map(mapRowToAxis));
      }
    } catch (e) {
      console.error("Error loading eval axes:", e);
    }
  }, []);

  const refreshPeople = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("people")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) { console.error("Failed to load people:", error); return; }
      if (data) setPeople((data as any[]).map(mapRowToPerson));
    } catch (e) { console.error("Error loading people:", e); }
  }, []);

  const refreshItems = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("kaizen_items")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) { console.error("Failed to load kaizen items:", error); return; }
      if (data) setKaizenItems((data as any[]).map(mapRowToItem));
    } catch (e) { console.error("Error loading kaizen items:", e); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => {
    Promise.all([refreshPeople(), refreshItems(), refreshEvalAxes()]);
  }, [refreshPeople, refreshItems, refreshEvalAxes]);

  const calculateImpactScore = useCallback((item: KaizenItem) => {
    const activeAxes = evalAxes.filter(a => a.isActive);
    if (activeAxes.length === 0) return 50;
    const totalWeight = activeAxes.reduce((s, a) => s + a.weight, 0);
    if (totalWeight === 0) return 50;
    // Simple heuristic score based on weights
    let score = 30;
    activeAxes.forEach(axis => {
      const normalizedWeight = axis.weight / totalWeight;
      score += normalizedWeight * 20; // base contribution
      // bonus for reproducibility
      if (axis.key === "reproducibility" && item.reproducibility === "高") score += normalizedWeight * 15;
      if (axis.key === "cross_functional") score += item.adoptedBy.length * 3 * normalizedWeight;
    });
    return Math.min(100, Math.round(score));
  }, [evalAxes]);

  const addEvalAxis = useCallback(async (axis: Omit<EvalAxis, "id" | "isActive">): Promise<EvalAxis | null> => {
    try {
      const { data, error } = await supabase.from("eval_axes").insert({
        name: axis.name,
        key: axis.key,
        description: axis.description,
        tooltip: axis.tooltip,
        left_label: axis.leftLabel,
        right_label: axis.rightLabel,
        default_value: axis.defaultValue,
        weight: axis.weight,
        sort_order: axis.sortOrder,
      }).select().single();
      if (error) { toast.error("評価軸の追加に失敗しました"); return null; }
      if (data) {
        const newAxis = mapRowToAxis(data);
        setEvalAxes(prev => [...prev, newAxis].sort((a, b) => a.sortOrder - b.sortOrder));
        return newAxis;
      }
      return null;
    } catch (e) { console.error("Error adding axis:", e); return null; }
  }, []);

  const updateEvalAxis = useCallback(async (id: string, updates: Partial<EvalAxis>) => {
    try {
      const dbUpdates: any = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.key !== undefined) dbUpdates.key = updates.key;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.tooltip !== undefined) dbUpdates.tooltip = updates.tooltip;
      if (updates.leftLabel !== undefined) dbUpdates.left_label = updates.leftLabel;
      if (updates.rightLabel !== undefined) dbUpdates.right_label = updates.rightLabel;
      if (updates.defaultValue !== undefined) dbUpdates.default_value = updates.defaultValue;
      if (updates.weight !== undefined) dbUpdates.weight = updates.weight;
      if (updates.sortOrder !== undefined) dbUpdates.sort_order = updates.sortOrder;
      if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
      const { error } = await supabase.from("eval_axes").update(dbUpdates).eq("id", id);
      if (error) { toast.error("評価軸の更新に失敗しました"); return; }
      setEvalAxes(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
    } catch (e) { console.error("Error updating axis:", e); }
  }, []);

  const deleteEvalAxis = useCallback(async (id: string) => {
    // 論理削除: is_active=false にすることで履歴のスコアは保持され、今後の再計算からは除外される
    try {
      const { error } = await supabase.from("eval_axes").update({ is_active: false }).eq("id", id);
      if (error) { toast.error("評価軸の削除に失敗しました"); return; }
      setEvalAxes(prev => prev.map(a => a.id === id ? { ...a, isActive: false } : a));
    } catch (e) { console.error("Error deleting axis:", e); }
  }, []);

  const updateAxisWeight = useCallback((id: string, weight: number) => {
    setEvalAxes(prev => prev.map(a => a.id === id ? { ...a, weight } : a));
  }, []);

  const addKaizenItem = useCallback(async (
    item: Omit<KaizenItem, "id" | "createdAt" | "impactScore" | "status"> & { adoptedBy?: string[] }
  ): Promise<KaizenItem | null> => {
    const adoptedBy = item.adoptedBy || [];
    const registeredItem: KaizenItem = {
      ...item, id: `temp-${Date.now()}`, createdAt: new Date().toISOString().slice(0, 10),
      adoptedBy, impactScore: 0, status: "ナレッジ登録済み",
    };
    registeredItem.impactScore = calculateImpactScore(registeredItem);
    try {
      const { data, error } = await supabase.from("kaizen_items").insert({
        title: item.title, problem: item.problem, cause: item.cause,
        solution: item.solution, effect: item.effect, department: item.department,
        category: item.category, reproducibility: item.reproducibility,
        tags: item.tags, status: "ナレッジ登録済み", author_id: item.authorId,
        author_name_snapshot: item.authorNameSnapshot,
        adopted_by: adoptedBy, impact_score: registeredItem.impactScore,
        occurrence_place: item.occurrencePlace || "", frequency: item.frequency || "",
        numerical_evidence: item.numericalEvidence || "",
      } as any).select().single();
      if (error) { toast.error("データベースへの保存に失敗しました"); return null; }
      if (data) {
        const dbItem = mapRowToItem(data);
        setKaizenItems(prev => [dbItem, ...prev.filter(i => i.id !== dbItem.id)]);
        return dbItem;
      }
      return null;
    } catch (e) { toast.error("データベースへの保存に失敗しました"); return null; }
  }, [calculateImpactScore]);

  const updateKaizenStatus = useCallback((id: string, status: KaizenItem["status"]) => {
    setKaizenItems(prev => prev.map(item => item.id === id ? { ...item, status } : item));
    (async () => {
      try {
        const { error } = await supabase.from("kaizen_items").update({ status }).eq("id", id);
        if (error) console.error("Failed to update status:", error);
      } catch (e) { console.error("Error updating status:", e); }
    })();
  }, []);

  const updateExecutionStage = useCallback(async (id: string, stage: ExecutionStage, changedBy = "admin", reason?: string) => {
    const current = kaizenItems.find(i => i.id === id);
    const fromStage = current?.executionStage || null;
    const now = new Date().toISOString();
    try {
      const { error } = await supabase
        .from("kaizen_items")
        .update({ execution_stage: stage, stage_changed_at: now, stage_changed_by: changedBy } as any)
        .eq("id", id);
      if (error) { toast.error("実行段階の更新に失敗しました"); return; }
      await supabase.from("execution_stage_history" as any).insert({
        kaizen_item_id: id, from_stage: fromStage, to_stage: stage, changed_by: changedBy, reason: reason || null,
      });
      setKaizenItems(prev => prev.map(i => i.id === id
        ? { ...i, executionStage: stage, stageChangedAt: now, stageChangedBy: changedBy }
        : i));
      toast.success(`実行段階を「${stage}」に更新しました`);
    } catch (e) { console.error("Error updating stage:", e); toast.error("実行段階の更新に失敗しました"); }
  }, [kaizenItems]);

  const updateAdminMemo = useCallback(async (id: string, memo: string) => {
    try {
      const { error } = await supabase.from("kaizen_items").update({ admin_memo: memo } as any).eq("id", id);
      if (error) { toast.error("メモの保存に失敗しました"); return; }
      setKaizenItems(prev => prev.map(i => i.id === id ? { ...i, adminMemo: memo } : i));
    } catch (e) { console.error("Error updating memo:", e); }
  }, []);

  const getStageHistory = useCallback(async (kaizenItemId: string): Promise<StageHistoryEntry[]> => {
    try {
      const { data, error } = await supabase
        .from("execution_stage_history" as any)
        .select("*")
        .eq("kaizen_item_id", kaizenItemId)
        .order("created_at", { ascending: false });
      if (error || !data) return [];
      return (data as any[]).map((r: any) => ({
        id: r.id, kaizenItemId: r.kaizen_item_id, fromStage: r.from_stage,
        toStage: r.to_stage, changedBy: r.changed_by, reason: r.reason, createdAt: r.created_at,
      }));
    } catch (e) { console.error("Error fetching history:", e); return []; }
  }, []);

  const addPerson = useCallback(async (person: Omit<Person, "id" | "isActive">): Promise<Person | null> => {
    try {
      const { data, error } = await supabase.from("people").insert({
        name: person.name, department: person.department, role: person.role,
        years_at_company: person.yearsAtCompany, avatar_initial: person.avatarInitial,
      }).select().single();
      if (error) { toast.error("提案者の追加に失敗しました"); return null; }
      if (data) { const np = mapRowToPerson(data); setPeople(prev => [...prev, np]); return np; }
      return null;
    } catch (e) { console.error("Error adding person:", e); return null; }
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
      if (error) { toast.error("提案者の更新に失敗しました"); return; }
      setPeople(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    } catch (e) { console.error("Error updating person:", e); }
  }, []);

  const deletePerson = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from("people").delete().eq("id", id);
      if (error) { toast.error("提案者の削除に失敗しました"); return; }
      setPeople(prev => prev.filter(p => p.id !== id));
    } catch (e) { console.error("Error deleting person:", e); }
  }, []);

  const getPersonById = useCallback((id: string) => people.find(p => p.id === id), [people]);
  const getKaizenByPerson = useCallback((personId: string) => kaizenItems.filter(k => k.authorId === personId), [kaizenItems]);
  const getKaizenByDepartment = useCallback((dept: string) => kaizenItems.filter(k => k.department === dept), [kaizenItems]);

  return (
    <KaiosContext.Provider value={{
      people, kaizenItems, isLoading,
      evalAxes, refreshEvalAxes, addEvalAxis, updateEvalAxis, deleteEvalAxis, updateAxisWeight,
      addKaizenItem, updateKaizenStatus, updateExecutionStage, updateAdminMemo, getStageHistory,
      getPersonById, getKaizenByPerson, getKaizenByDepartment,
      calculateImpactScore, refreshItems, refreshPeople,
      addPerson, updatePerson, deletePerson,
    }}>
      {children}
    </KaiosContext.Provider>
  );
};
