import { Settings } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageHelpGuide from "@/components/kaios/PageHelpGuide";

const SettingsPage = () => {
  return (
    <main className="flex-1 bg-kaios-surface overflow-auto">
      <div className="p-4 sm:p-6 max-w-[800px] mx-auto space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Settings className="w-6 h-6 text-primary" />
              設定
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              個人向けの設定画面です。
            </p>
          </div>
          <PageHelpGuide
            title="設定 — 使い方"
            overview="個人アカウントに関する設定を確認できます。評価方針や提案者管理などの組織設定は管理者ページから操作してください。"
            steps={[
              { icon: "👤", title: "アカウント", description: "ログイン中のユーザー情報はサイドバー下部から確認できます。" },
            ]}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">アカウント情報</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              現在のアカウント情報はサイドバー下部に表示されています。ログアウトもサイドバーから行えます。
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              ※ 評価方針設定・提案者管理は管理者専用機能のため、ここには表示されません。
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default SettingsPage;
