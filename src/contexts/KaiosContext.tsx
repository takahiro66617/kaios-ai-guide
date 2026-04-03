import React, { createContext, useContext, useState, useCallback } from "react";

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
  adoptedBy: string[]; // department names that adopted this
  impactScore: number; // 0-100, calculated from eval settings
}

export interface EvalSettings {
  speed: number;
  crossFunctional: number;
}

// ===== Seed Data =====

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

const INITIAL_KAIZEN: KaizenItem[] = [
  {
    id: "k1", title: "問い合わせ返信のたたき台テンプレート化",
    problem: "問い合わせ対応が属人化しており、新人の対応品質にバラつきがあった",
    cause: "返信の型が個人のスキルに依存していた",
    solution: "よくある問い合わせパターンごとにテンプレートを作成し、社内Wikiに整備した",
    effect: "対応時間を平均30%短縮、新人の立ち上がり期間を2週間→3日に短縮",
    department: "カスタマーサポート部", category: "標準化", reproducibility: "高",
    tags: ["テンプレート", "属人化解消", "新人教育", "対応品質"],
    status: "完了", authorId: "p1", createdAt: "2025-10-15",
    adoptedBy: ["営業部", "人事部", "総務部"], impactScore: 88,
  },
  {
    id: "k2", title: "顧客要望のSlack自動集約Bot作成",
    problem: "顧客からの要望がSlackの複数チャネルに散在し、把握できていなかった",
    cause: "要望の集約ルールやフローが未整備だった",
    solution: "特定の絵文字リアクションで要望をタグ付けし、自動でスプレッドシートに集約するBotを開発",
    effect: "要望の見落とし率を90%削減。月次の要望レビュー会議の準備時間を5時間→30分に",
    department: "カスタマーサポート部", category: "DX推進", reproducibility: "高",
    tags: ["Slack", "自動化", "Bot", "要望管理"],
    status: "完了", authorId: "p1", createdAt: "2025-08-20",
    adoptedBy: ["開発部", "マーケティング部"], impactScore: 92,
  },
  {
    id: "k3", title: "営業報告書の自動生成",
    problem: "週次の営業報告書作成に毎回2時間以上かかっていた",
    cause: "CRMデータを手動で集計し、フォーマットに転記していた",
    solution: "CRMのAPIからデータを自動取得し、テンプレートに流し込むスクリプトを作成",
    effect: "報告書作成の工数を80%削減（2時間→20分）",
    department: "営業部", category: "業務効率化", reproducibility: "高",
    tags: ["自動化", "レポート", "CRM", "工数削減"],
    status: "完了", authorId: "p3", createdAt: "2025-06-10",
    adoptedBy: ["経営企画部"], impactScore: 85,
  },
  {
    id: "k4", title: "製造ラインの予防保全システム",
    problem: "設備故障による突発的なライン停止が月2〜3回発生",
    cause: "定期点検のみで予兆検知ができていなかった",
    solution: "IoTセンサーデータをリアルタイム監視し、異常パターンをAIで検知するシステムを導入",
    effect: "ダウンタイムを40%削減、年間コスト800万円の削減効果",
    department: "製造部", category: "DX推進", reproducibility: "中",
    tags: ["IoT", "AI", "予防保全", "コスト削減"],
    status: "実行中", authorId: "p5", createdAt: "2025-09-01",
    adoptedBy: [], impactScore: 90,
  },
  {
    id: "k5", title: "経費精算フローの電子化",
    problem: "紙ベースの経費精算で承認に平均3日かかっていた",
    cause: "物理的な回覧と押印フローが必要だった",
    solution: "ワークフローシステムを導入し、スマホから申請・承認可能に",
    effect: "承認リードタイムを3日→即日に短縮。ペーパーレス化で年間30万枚の紙を削減",
    department: "経理部", category: "業務効率化", reproducibility: "高",
    tags: ["ペーパーレス", "ワークフロー", "電子化", "承認"],
    status: "完了", authorId: "p6", createdAt: "2024-11-20",
    adoptedBy: ["総務部", "営業部"], impactScore: 78,
  },
  {
    id: "k6", title: "在庫管理のリアルタイムダッシュボード",
    problem: "在庫状況の把握に半日以上のタイムラグがあった",
    cause: "在庫データが基幹システムにしかなく、現場で確認できなかった",
    solution: "倉庫の在庫データをリアルタイムで可視化するダッシュボードを構築",
    effect: "発注判断の迅速化、在庫回転率15%改善",
    department: "物流部", category: "可視化", reproducibility: "中",
    tags: ["ダッシュボード", "リアルタイム", "在庫管理"],
    status: "ナレッジ登録済み", authorId: "p7", createdAt: "2026-01-15",
    adoptedBy: [], impactScore: 65,
  },
  {
    id: "k7", title: "社内FAQ AIチャットボットの導入",
    problem: "社内ヘルプデスクへの問い合わせが月500件以上で対応が追いつかない",
    cause: "FAQが整備されておらず、同じ質問が繰り返されていた",
    solution: "過去の問い合わせをAIで学習させたチャットボットを導入し24時間対応可能に",
    effect: "問い合わせの60%をチャットボットが自動回答、対応工数を月80時間削減",
    department: "情報システム部", category: "DX推進", reproducibility: "高",
    tags: ["チャットボット", "AI", "FAQ", "自動応答"],
    status: "完了", authorId: "p2", createdAt: "2025-04-10",
    adoptedBy: ["カスタマーサポート部", "人事部"], impactScore: 95,
  },
  {
    id: "k8", title: "会議資料のテンプレート標準化",
    problem: "部門ごとに会議資料フォーマットがバラバラで読みにくい",
    cause: "全社統一のテンプレートが存在しなかった",
    solution: "目的別（報告・意思決定・ブレスト）のテンプレート3種を作成し全社展開",
    effect: "資料準備時間30%削減、会議の生産性向上",
    department: "経営企画部", category: "標準化", reproducibility: "高",
    tags: ["テンプレート", "標準化", "会議", "生産性"],
    status: "完了", authorId: "p4", createdAt: "2025-07-01",
    adoptedBy: ["営業部", "製造部", "物流部"], impactScore: 72,
  },
  {
    id: "k9", title: "部門横断プロジェクト管理ツール導入",
    problem: "複数部門が関わるプロジェクトで情報共有にタイムラグが発生",
    cause: "部門ごとに異なるツールを使用しており、横断的な可視化ができなかった",
    solution: "全社共通のプロジェクト管理ツールを導入し、ステータスをリアルタイム共有",
    effect: "プロジェクト完了率20%向上、コミュニケーションコスト50%削減",
    department: "経営企画部", category: "標準化", reproducibility: "中",
    tags: ["プロジェクト管理", "部門横断", "ツール導入"],
    status: "実行中", authorId: "p4", createdAt: "2026-02-01",
    adoptedBy: [], impactScore: 71,
  },
  {
    id: "k10", title: "定型業務のRPA自動化",
    problem: "月末の集計作業に営業アシスタント3名で丸2日かかっていた",
    cause: "手作業でのデータ転記と集計が多い",
    solution: "RPAツールを導入し、データ収集→集計→レポート出力を自動化",
    effect: "月末集計を2日→2時間に短縮、人的ミスをゼロに",
    department: "営業部", category: "業務効率化", reproducibility: "高",
    tags: ["RPA", "自動化", "集計", "ミス防止"],
    status: "構造化済み", authorId: "p3", createdAt: "2026-03-15",
    adoptedBy: [], impactScore: 80,
  },
];

// ===== Context =====

interface KaiosContextType {
  people: Person[];
  kaizenItems: KaizenItem[];
  evalSettings: EvalSettings;
  setEvalSettings: (s: EvalSettings) => void;
  addKaizenItem: (item: Omit<KaizenItem, "id" | "createdAt" | "adoptedBy" | "impactScore" | "status">) => KaizenItem;
  updateKaizenStatus: (id: string, status: KaizenItem["status"]) => void;
  getPersonById: (id: string) => Person | undefined;
  getKaizenByPerson: (personId: string) => KaizenItem[];
  getKaizenByDepartment: (dept: string) => KaizenItem[];
  calculateImpactScore: (item: KaizenItem) => number;
}

const KaiosContext = createContext<KaiosContextType | null>(null);

export const useKaios = () => {
  const ctx = useContext(KaiosContext);
  if (!ctx) throw new Error("useKaios must be used within KaiosProvider");
  return ctx;
};

export const KaiosProvider = ({ children }: { children: React.ReactNode }) => {
  const [kaizenItems, setKaizenItems] = useState<KaizenItem[]>(INITIAL_KAIZEN);
  const [evalSettings, setEvalSettings] = useState<EvalSettings>({ speed: 70, crossFunctional: 85 });

  const calculateImpactScore = useCallback((item: KaizenItem) => {
    const baseScore = 50;
    // Speed factor: items with quick execution get bonus
    const speedBonus = evalSettings.speed * 0.15;
    // Cross-functional factor: items adopted by multiple depts get bonus
    const crossBonus = (item.adoptedBy.length * 8) * (evalSettings.crossFunctional / 100);
    // Reproducibility bonus
    const reproBonus = item.reproducibility === "高" ? 15 : item.reproducibility === "中" ? 8 : 0;
    return Math.min(100, Math.round(baseScore + speedBonus + crossBonus + reproBonus));
  }, [evalSettings]);

  const addKaizenItem = useCallback((item: Omit<KaizenItem, "id" | "createdAt" | "adoptedBy" | "impactScore" | "status">) => {
    const newItem: KaizenItem = {
      ...item,
      id: `k${Date.now()}`,
      createdAt: new Date().toISOString().slice(0, 10),
      adoptedBy: [],
      impactScore: 0,
      status: "構造化済み",
    };
    newItem.impactScore = calculateImpactScore(newItem);
    setKaizenItems(prev => [newItem, ...prev]);
    return newItem;
  }, [calculateImpactScore]);

  const updateKaizenStatus = useCallback((id: string, status: KaizenItem["status"]) => {
    setKaizenItems(prev => prev.map(item => item.id === id ? { ...item, status } : item));
  }, []);

  const getPersonById = useCallback((id: string) => PEOPLE.find(p => p.id === id), []);
  const getKaizenByPerson = useCallback((personId: string) => kaizenItems.filter(k => k.authorId === personId), [kaizenItems]);
  const getKaizenByDepartment = useCallback((dept: string) => kaizenItems.filter(k => k.department === dept), [kaizenItems]);

  return (
    <KaiosContext.Provider value={{
      people: PEOPLE,
      kaizenItems,
      evalSettings,
      setEvalSettings,
      addKaizenItem,
      updateKaizenStatus,
      getPersonById,
      getKaizenByPerson,
      getKaizenByDepartment,
      calculateImpactScore,
    }}>
      {children}
    </KaiosContext.Provider>
  );
};
