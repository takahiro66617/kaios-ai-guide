# KAIOS MTG (2026-04-30) — 設計仕様書

## 1. ミーティング抜粋（該当箇所のみ）

### 評価軸設計

> 三つの軸はもう固定軸で重要ですよみたいなやつを、もう三つこっちで埋めちゃおうかと思うんで、今一応案として出してるのは本質軸と収益寄与性と実現性。まあ、これぐらいの三つ目軸を決めて、ま、これは基本的に外に出したら、一番重要視されるポイントですよっていう。全部で、えーと、百パーセントのうちの六十パーセントをこの三つで締める。だから二十パーセント。

> 残りの四十パーセントをして、なんかその会社の色が出るみたいにしてたらどうかな。で、えっと、それを二十パーセント二十パーセントで、分けてて、戦略軸と文化軸みたいな感じで、これも僕たちが例えば七つとか十個ぐらい決めちゃっても、お客さん勝手に入れていくとかじゃなくて、こういうそう、こういう戦略、こういう文化みたいなやつをこっちで、まあ、ある程度提示しちゃって、そのうちの二個を選んでもらうみたいな、どうかなって。

### ステータス管理

> 運用していくとその基本的には実行済みのやつを、その出してもらう？ベースになると思うんですけど、多分権限がないやつとか多分出てくるじゃないですか。なんかこれ変えたい方がいいけど、自分の権限の中でもどうしようもないけど。それが多分出てくると思うので、一応それもそのー、蓄積するような仕組みにした方がいいかなみたいな。なんでここの、えっとー、ステータスを三つに分ける。

> ステータスが三つに分ける。で（実行済み）それも管理できるような感じにした方がいいかなって。

> これ単純にその行されてたら何パーセントアップでもいいし、なんかその（ポイント）を割り振るみたいな感じでも何でもいいんで、実行した方がポイントがすごくなるよみたいな。まあ、実行ポイントみたいな感じでやってもいいしそのプラス加点で。だから、えーと、もともとの表点ポイントがベースのスコアが八十点だとして、そこに実行の、えーと、プラスが、ま、例えば最大で二十ポイントつくみたいな感じにしてて、で十ポイントついて九十点みたいな感じ？

### ダッシュボード要件

> その二軸で必要かなみたいな。そうですね。そこは確かに本当そうなんですよ。改善シートをどんどん出してもらうためのゲーミフィケーションというか、こう、UIの作り込みとか、レベルアップの仕組みのニークさみたいなところも必要だし、実際それをこう管理職の人が実行に関言してくれる管理職の人が使いたくなるやすいみたいなことも重要なので。

> なんか、そのステータスが例えば魔法使い。戦士に変わったとか、なんかそんなの、なんか完全に遊びの要素。みたいな感じでも正直遠かな感じ。それそれ結構楽じゃないですか。うん。AIに診断させて、そのタイプ表示させるだけみたいなのだったら、さっきの評価軸の根質性収益寄せ実現性だから、なんかこれになぞわった室性が高いって、やん、得意の社員は。神社みたいな。

---

## 2. 現システムとのギャップ分析

### A. 評価軸設計

| 要件 | 現状 | ギャップ |
|------|------|---------|
| 本質性・収益寄与性・実現性を固定軸（各20%）にする | `EvaluationSettings.tsx` は全軸を自由に追加・削除・重み変更可 | **固定軸の概念が存在しない** |
| 固定3軸で合計60%を占める | スライダーで0〜100%を自由設定、合計100%制約なし | **配分ロジックが存在しない** |
| 戦略軸・文化軸を各20%の選択式カスタム軸にする | 軸は手動入力のみ（名前・キー・説明を自分で書く） | **プリセット選択方式が存在しない** |
| カスタム軸は7〜10個の選択肢から2つを選ぶ | 無制限に追加可 | **上限・選択方式が存在しない** |

**ファイル:** `src/components/kaios/EvaluationSettings.tsx`, `src/contexts/KaiosContext.tsx`

### B. ステータス管理（実行段階）

| 要件 | 現状 | ギャップ |
|------|------|---------|
| 実行段階を「提案中・実行済み・権限外」の3分類にする | `EXECUTION_STAGES = ["提案中", "実行予定", "実行済み"]` で「実行予定」あり、「権限外」なし | **「権限外」ステージが存在しない** |
| 実行済みに最大+20ポイントの加点 | `impactScore` はAI計算のみ、実行ステージ連動の加点なし | **実行加点ロジックが存在しない** |
| ステータスをダッシュボードで管理 | `AdminDashboardPage.tsx` で `execution_stage` の変更は可能 | **権限外への遷移UIと加点表示がない** |

**ファイル:** `src/contexts/KaiosContext.tsx` (EXECUTION_STAGES), `src/pages/admin/AdminDashboardPage.tsx`, `src/pages/ImpactPage.tsx`

### C. ダッシュボード — ゲーミフィケーション（キャラクター診断）

| 要件 | 現状 | ギャップ |
|------|------|---------|
| AIが評価軸の傾向からユーザーのキャラクタータイプを診断 | XP・レベル・タイトル（「見習い」〜「殿堂入り」）のみ | **キャラクタータイプ診断が存在しない** |
| 評価軸（本質性/収益寄与性/実現性）の得意傾向でタイプ表示 | ゲーミフィケーション要素はXP・ミッション・連続日数 | **軸ベースの診断ロジックが存在しない** |
| 「戦士」「魔法使い」「賢者」等のビジュアル表示 | `DashboardPage.tsx` にアバターなし（数字のみ） | **キャラクタービジュアルが存在しない** |

**ファイル:** `src/pages/DashboardPage.tsx`, `src/contexts/GuestProfileContext.tsx`

---

## 3. 実装仕様

### 3-A. 評価軸の固定軸 / カスタム軸 分離

#### DB変更（マイグレーション追加）

```sql
-- eval_axes テーブルに軸タイプを追加
ALTER TABLE eval_axes
  ADD COLUMN axis_type text NOT NULL DEFAULT 'custom'
    CHECK (axis_type IN ('fixed', 'strategic', 'cultural')),
  ADD COLUMN weight_locked boolean NOT NULL DEFAULT false;

-- 固定3軸のシード（存在しない場合のみINSERT）
INSERT INTO eval_axes (name, key, description, axis_type, weight, weight_locked, sort_order, is_active)
SELECT * FROM (VALUES
  ('本質性',     'essence',     '問題の根本に対する本質的なアプローチかどうか',         'fixed',    20, true, 1, true),
  ('収益寄与性', 'profitability','実行した際のコスト削減・売上向上・損失回避への貢献度', 'fixed',    20, true, 2, true),
  ('実現性',     'feasibility', '現在のリソース・権限・技術で実現可能かどうか',         'fixed',    20, true, 3, true)
) AS v(name, key, description, axis_type, weight, weight_locked, sort_order, is_active)
WHERE NOT EXISTS (
  SELECT 1 FROM eval_axes WHERE axis_type = 'fixed'
);
```

#### `EvalAxis` 型拡張（`KaiosContext.tsx`）

```typescript
export interface EvalAxis {
  // 既存フィールド...
  axisType: 'fixed' | 'strategic' | 'cultural';  // 追加
  weightLocked: boolean;                           // 追加（固定軸はtrue）
}
```

#### `EvaluationSettings.tsx` UI変更

- **固定軸カード（本質性・収益寄与性・実現性）**
  - スライダー・削除ボタン・編集ボタンを非表示（`weightLocked = true` 判定）
  - 「固定 20%」バッジを表示
  - セクションヘッダー「固定評価軸（60%）—システム固定」

- **カスタム軸セクション（戦略軸・文化軸）**
  - 「軸を追加」ボタンを廃止し、「戦略軸を選ぶ」「文化軸を選ぶ」セレクター2つに置換
  - 各セレクターは以下のプリセットから1つを選択（合計2軸・各20%固定）

```typescript
const STRATEGIC_OPTIONS = [
  { key: 'cost_reduction',    name: '原価低減',       description: '直接コストの削減・効率化' },
  { key: 'productivity',      name: '生産性向上',     description: '工数・作業時間の削減' },
  { key: 'quality_up',        name: '品質向上',       description: '不良率・クレームの低減' },
  { key: 'sales_growth',      name: '売上成長',       description: '顧客獲得・単価向上' },
  { key: 'risk_reduction',    name: 'リスク低減',     description: '事故・コンプラリスクの排除' },
  { key: 'speed_to_market',   name: 'スピード',       description: '意思決定・実行速度の向上' },
  { key: 'digital_shift',     name: 'DX推進',         description: 'デジタル化・自動化の推進' },
] as const;

const CULTURAL_OPTIONS = [
  { key: 'psychological_safety', name: '心理的安全性', description: '発言・挑戦しやすい職場風土' },
  { key: 'cross_functional',     name: '部門横断',     description: '部署をまたいだ連携・横展開' },
  { key: 'ownership',            name: '当事者意識',   description: '個人の主体性・オーナーシップ' },
  { key: 'learning',             name: '学習文化',     description: '失敗から学ぶ・知識共有' },
  { key: 'customer_first',       name: '顧客起点',     description: '顧客視点での改善・価値提供' },
  { key: 'diversity',            name: '多様性',       description: '多様なバックグラウンドの活用' },
  { key: 'sustainability',       name: 'サステナ',     description: '環境・社会的責任への配慮' },
] as const;
```

- **配分サマリー表示**（常に固定）
  ```
  固定軸 3軸 × 20% = 60%
  戦略軸 1軸 × 20% = 20%
  文化軸 1軸 × 20% = 20%
  合計 = 100%
  ```

---

### 3-B. 実行段階の「権限外」追加と加点ロジック

#### 型変更（`KaiosContext.tsx`）

```typescript
// 変更前
export type ExecutionStage = "提案中" | "実行予定" | "実行済み";
export const EXECUTION_STAGES: ExecutionStage[] = ["提案中", "実行予定", "実行済み"];

// 変更後
export type ExecutionStage = "提案中" | "実行予定" | "実行済み" | "権限外";
export const EXECUTION_STAGES: ExecutionStage[] = ["提案中", "実行予定", "実行済み", "権限外"];

// 加点定数
export const EXECUTION_BONUS_POINTS = {
  "提案中":   0,
  "実行予定": 10,
  "実行済み": 20,
  "権限外":   0,
} as const satisfies Record<ExecutionStage, number>;
```

#### `impactScore` 表示への加点反映

`ImpactPage.tsx` および `AdminDashboardPage.tsx` のスコア表示部分で：

```typescript
// 表示スコア = AIスコア（ベース）+ 実行加点
const displayScore = (item: KaizenItem) =>
  Math.min(100, item.impactScore + EXECUTION_BONUS_POINTS[item.executionStage]);
```

> **注:** DB の `impact_score` カラムは変更しない（ベーススコアを保持）。  
> 実行加点は表示層でのみ計算し、フィルタ・ランキングにも反映する。

#### `AdminDashboardPage.tsx` の変更

- `STAGE_COLORS` に「権限外」を追加

```typescript
const STAGE_COLORS: Record<ExecutionStage, string> = {
  "提案中":   "bg-blue-500/10 text-blue-700 border-blue-200",
  "実行予定": "bg-amber-500/10 text-amber-700 border-amber-200",
  "実行済み": "bg-green-500/10 text-green-700 border-green-200",
  "権限外":   "bg-slate-500/10 text-slate-600 border-slate-200",  // 追加
};
```

- 「権限外」選択時に `reason` 入力（権限外理由）を必須とするUIを追加
- `execution_stage_history` テーブルの `reason` フィールドに保存

#### `ImpactPage.tsx` の変更

- KPI「実行完了率」の定義を明確化：  
  `completedItems = 実行済み` / `totalItems = 提案中 + 実行予定 + 実行済み`（権限外は分母・分子ともに除外）
- 高インパクト改善案リストに「実行加点込みスコア」を表示

---

### 3-C. ユーザー向けキャラクタータイプ診断（ゲーミフィケーション）

#### 診断ロジック

ユーザーが提出した承認済み改善案のうち、固定3軸の傾向をAIスコアの内訳から計算し、最も高い軸でタイプを決定。

```typescript
type CharacterType = {
  id:          string;
  name:        string;  // 例: "本質探求者"
  archetype:   string;  // 例: "賢者"
  emoji:       string;  // 例: "🧙"
  description: string;
  dominantAxis: 'essence' | 'profitability' | 'feasibility';
  color:       string;
};

const CHARACTER_TYPES: CharacterType[] = [
  {
    id: 'sage',
    name: '本質探求者',
    archetype: '賢者',
    emoji: '🧙',
    description: '問題の根本を見抜き、長期的な解決策を導き出す洞察力の持ち主。',
    dominantAxis: 'essence',
    color: 'from-purple-500 to-indigo-600',
  },
  {
    id: 'warrior',
    name: '収益の戦士',
    archetype: '戦士',
    emoji: '⚔️',
    description: '組織の収益・コスト・売上に直結する改善を次々と実行する実行力の持ち主。',
    dominantAxis: 'profitability',
    color: 'from-orange-500 to-red-600',
  },
  {
    id: 'engineer',
    name: '実装の魔法使い',
    archetype: '魔法使い',
    emoji: '✨',
    description: '現実的なリソースの中で確実に動く改善を生み出す実現力の持ち主。',
    dominantAxis: 'feasibility',
    color: 'from-cyan-500 to-blue-600',
  },
  {
    id: 'hero',
    name: '万能の英雄',
    archetype: '英雄',
    emoji: '🦸',
    description: '3軸をバランスよく高めたオールラウンダー。組織の改善文化を牽引する。',
    dominantAxis: 'essence',  // tie-break用（同スコアの場合）
    color: 'from-yellow-500 to-amber-600',
  },
];
```

#### `DashboardPage.tsx` への追加

**キャラクターカード**をレベルカードの下に追加：

```tsx
{/* Character Type Card */}
<Card className="overflow-hidden">
  <div className={`bg-gradient-to-br ${character.color} p-5 text-white`}>
    <div className="flex items-center gap-4">
      <div className="text-5xl">{character.emoji}</div>
      <div>
        <p className="text-white/70 text-xs">あなたのタイプ</p>
        <h2 className="text-xl font-bold">{character.archetype}「{character.name}」</h2>
        <p className="text-white/80 text-sm mt-1">{character.description}</p>
      </div>
    </div>
    {/* 3軸レーダー風バー表示 */}
    <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
      <AxisBar label="本質性"     value={essenceScore}     />
      <AxisBar label="収益寄与性" value={profitScore}      />
      <AxisBar label="実現性"     value={feasibilityScore} />
    </div>
  </div>
</Card>
```

#### スコア計算

```typescript
// GuestProfileContext または DashboardPage 内で計算
const characterScores = useMemo(() => {
  const myItems = kaizenItems.filter(k =>
    k.authorId === mePerson?.id && k.status === "承認済み"
  );
  if (myItems.length === 0) return null;

  // 平均impactScore × 各軸の相対ウェイト
  const avgScore = myItems.reduce((s, i) => s + i.impactScore, 0) / myItems.length;
  const essenceAxis     = evalAxes.find(a => a.key === 'essence');
  const profitAxis      = evalAxes.find(a => a.key === 'profitability');
  const feasibilityAxis = evalAxes.find(a => a.key === 'feasibility');

  return {
    essence:      Math.round(avgScore * ((essenceAxis?.weight ?? 20) / 100)),
    profitability:Math.round(avgScore * ((profitAxis?.weight ?? 20) / 100)),
    feasibility:  Math.round(avgScore * ((feasibilityAxis?.weight ?? 20) / 100)),
  };
}, [kaizenItems, mePerson, evalAxes]);
```

---

## 4. 実装順序

| 優先度 | 項目 | 変更ファイル | 工数感 |
|--------|------|------------|-------|
| **1** | 評価軸の固定軸/カスタム軸 分離（DB + UI） | `supabase/migrations/新規.sql`, `EvaluationSettings.tsx`, `KaiosContext.tsx` | 大 |
| **2** | 「権限外」実行段階の追加 | `KaiosContext.tsx`, `AdminDashboardPage.tsx`, `ImpactPage.tsx` | 小 |
| **3** | 実行加点ロジック（+20pt）の表示層実装 | `ImpactPage.tsx`, `AdminDashboardPage.tsx`, `KaiosContext.tsx` | 小 |
| **4** | キャラクタータイプ診断カード | `DashboardPage.tsx`, `GuestProfileContext.tsx` | 中 |

> **優先度1は固定軸シードのINSERTが他の全ての評価ロジックに影響するため、最初に実施すること。**

---

## 5. アクションアイテム（ミーティング合意事項）

- [ ] 高村さん（面接AIシステム）への動画連絡を入れる（担当: Me）
- [ ] 面接官研修AIの機能要件を詰める（次回MTG議題）
- [ ] 評価軸プリセット7〜10個のコンテンツ確認・承認（担当: 伊藤）
- [ ] ダッシュボードワイヤーフレームをAI（Gemini Canvas等）で作成（担当: 伊藤）
- [ ] 5月6日 次回MTG（面接システム + ダッシュボード設計）
