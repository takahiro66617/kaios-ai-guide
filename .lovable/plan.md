# 3階層権限（Admin / Manager / Employee）導入プラン

## 回答整理（確定事項）

| # | 項目 | 決定 |
|---|---|---|
| 1 | Manager の管轄単位 | **部署（department）単位**、複数可 |
| 2 | Employee の閲覧範囲 | **他人の改善案も閲覧可**（読み取りは全員OK、編集は自分のみ） |
| 3 | Manager の評価軸権限 | **閲覧のみ**（編集不可） |
| 4 | 承認フロー | **Admin のみ**（Manager 不可） |
| 5 | 既存ユーザー移行 | 既存 admin はそのまま／それ以外は **Employee** |

---

## 各ロールの権限マトリクス（最終形）

| 機能 | Employee | Manager | Admin |
|---|---|---|---|
| 改善を提出する | ◯ | ◯ | ◯ |
| ダッシュボード（自分のみ）| ◯ | ◯ | ◯ |
| 類似事例（全社の閲覧） | ◯ | ◯ | ◯ |
| インパクト分析（自分） | ◯ | ◯ | ◯ |
| ミッション | ◯ | ◯ | ◯ |
| **管轄部署の提案を閲覧** | ✕ | ◯ | ◯ |
| **管轄部署の実行段階を更新** | ✕ | ◯ | ◯ |
| **承認／差戻し** | ✕ | ✕ | ◯ |
| 評価方針設定 | ✕ | **閲覧のみ** | 編集◯ |
| 提案者管理 | ✕ | ✕ | ◯ |
| バグレポート | ✕ | ✕ | ◯ |
| 管理者ダッシュボード（全社） | ✕ | ✕ | ◯ |

---

## 実装方針（3フェーズ・1メッセージで全部実施）

### Phase 1: DB 基盤
1. `app_role` enum に `manager`, `employee` を追加
2. `manager_departments(user_id, department)` テーブル新設（複数管轄対応）
3. security definer 関数追加
   - `is_manager_of_department(_user_id, _dept) → bool`
   - `get_user_role(_user_id) → app_role`（最高権限を返す）
4. 既存ユーザー一括移行：`admin` を持たない全 user に `employee` ロールを INSERT
5. RLS 更新（最小限）：
   - `kaizen_items`: 既存「全員 SELECT」維持（Q2 の決定どおり）／UPDATE は `admin OR (manager AND 同部署) OR owner`
   - `execution_stage_history`: INSERT/SELECT を `admin OR manager` に拡張
   - `eval_axes`: SELECT を `admin OR manager` に拡張、INSERT/UPDATE/DELETE は admin のみ維持
   - `manager_departments`: admin のみ書き込み、本人と admin が読み取り
6. `validate_kaizen_status` トリガー：承認 (`承認済み`) 遷移は **admin のみ** を維持（Manager は不可）

### Phase 2: フロントエンド
1. `AuthContext` を拡張
   - `role: 'admin' | 'manager' | 'employee'`
   - `managedDepartments: string[]`
   - `isAdmin`（後方互換維持）／`isManager`／`isEmployee`
2. `ProtectedRoute` に `requireManagerOrAdmin` を追加
3. `KaiosSidebar` の menu を 3 階層で出し分け
   - Manager: 「評価方針設定（閲覧）」「管轄部署の提案一覧（管理ダッシュボードを Manager 用にフィルタ表示）」
   - Admin: フル
4. `EvaluationSettings`: Manager の場合 input/slider/button を `disabled` 化＋「閲覧のみ」バナー
5. `AdminDashboardPage`: Manager の場合 `managedDepartments` でフィルタ、承認ボタンは非表示
6. `KaizenInputPage` / `SimilarCasesPage` 等の現場機能は全ロール共通

### Phase 3: Edge Functions
1. `admin-create-user`: `is_admin` フラグの代わりに `role: 'admin'|'manager'|'employee'` と `managed_departments?: string[]` を受け取る
2. `admin-manage-user`: `set_admin` を `set_role` に置き換え（旧 action は後方互換維持）
3. `admin-update-user`: 同様
4. `recalculate-impact`, `structure-kaizen`: 認可チェック追加（管理系再計算は admin のみ）

---

## 想定リスクと対策

| # | リスク | 影響 | 対策 |
|---|---|---|---|
| R1 | 既存ユーザーが Employee 化された結果、これまで見えていた管理画面に入れず混乱 | 中 | サイドバーで「管理機能」セクションを完全非表示。ログ等で 403 を出さず Navigate でリダイレクト |
| R2 | RLS の OR 条件のミスで Manager が他部署も触れる/触れない | **高** | `is_manager_of_department(uid, dept)` を1つの security definer に集約。テーブル側は単純に呼ぶだけにして条件分岐を最小化 |
| R3 | 既存 admin の重複ロール挿入で UNIQUE 違反 | 中 | INSERT は `WHERE NOT EXISTS` で冪等化 |
| R4 | `validate_kaizen_status` トリガーで Manager が実行段階更新時に弾かれる | 中 | 実行段階 (`execution_stage`) は `validate_execution_stage` 側で別管理。`status` (承認済み等) と分離されており影響なし。Manager は `execution_stage` だけを更新する想定 |
| R5 | `app_role` enum への値追加は ALTER TYPE で可能だがトランザクション内で同 enum を即使用するとエラー | 中 | enum 追加と利用 INSERT を**別マイグレーション**に分けず、CREATE TYPE → COMMIT → 利用ではなく、`ALTER TYPE` 後に **同マイグレーション内で利用しない**設計（ロール INSERT は手動 insert ツールで後実施） |
| R6 | フロント `isAdmin` を参照している箇所が他にないか | 中 | 一括 grep し、`isAdmin` の意味を「admin のみ」に厳密化（Manager は別フラグ）。誤って Manager が admin 扱いされないようにする |
| R7 | 管理者ダッシュボードでの Manager の見え方の不整合 | 中 | ダッシュボードのクエリ側で `if (isManager && !isAdmin) filter by managed_departments` を明示的に入れる |
| R8 | Manager 管轄部署の入力 UI が無く運用で困る | 中 | `PeopleManagementPage` のアカウント編集モーダルに「ロール選択」と「Manager の場合の管轄部署マルチセレクト」を追加 |
| R9 | Edge Function の `is_admin` チェックが Manager を 403 にしてしまう（管理アクションは妥当） | 低 | 設計通り：管理アクション（ユーザー作成/削除）は admin のみで OK |
| R10 | QA 工数 | 中 | 3ロール × 主要画面 5〜6 で **15〜18 シナリオ**。 デモアカウント（admin1名・manager1名・employee1名）を seed-demo-accounts 関数に追加して切り替え検証しやすくする |

---

## 実装順（1メッセージで A〜D まで完了予定）

- **A. DB マイグレーション**（enum 追加 + manager_departments + 関数 + RLS 更新）
- **B. 既存ユーザーへの employee ロール一括 INSERT**（insert ツール）
- **C. AuthContext + ProtectedRoute + Sidebar + EvaluationSettings + AdminDashboardPage 修正**
- **D. Edge Functions（admin-create-user / admin-manage-user / admin-update-user）拡張**＋ PeopleManagementPage に Manager UI 追加

実装後の確認：
- ログイン状態で sidebar の menu が想定どおり出し分けされる
- Manager で `/eval-settings` を開くと閲覧のみで編集不可
- Manager で `/admin/dashboard` を開くと管轄部署の提案だけ見え、承認ボタンが非表示

---

## 確認事項

この方向性・リスクケアで OK でしたら「進めて」と返答ください。
特に **R5（enum と利用の同マイグレーション分離）** と **R8（管轄部署の入力 UI を PeopleManagement に追加）** は仕様判断が入ります。問題なければそのまま実行します。
