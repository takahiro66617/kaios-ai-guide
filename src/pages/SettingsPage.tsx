import { Settings, Palette } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import PageHelpGuide from "@/components/kaios/PageHelpGuide";

const SettingsPage = () => {
  const navigate = useNavigate();

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
              KAIOSの各種設定へのショートカットです。
            </p>
          </div>
          <PageHelpGuide
            title="設定 — 使い方"
            overview="KAIOSの主要な設定ページへのショートカットを提供します。"
            steps={[
              { icon: "⚙️", title: "評価方針設定", description: "AIがインパクトスコアを算出する際のウェイト（Speed / Cross-functional）を調整します。" },
              { icon: "👤", title: "提案者管理", description: "改善案の提案者（メンバー）を追加・編集・削除します。" },
            ]}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Palette className="w-4 h-4" />
              クイックアクセス
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
              <div>
                <Label className="text-sm font-medium">評価方針設定</Label>
                <p className="text-xs text-muted-foreground mt-0.5">AIの評価基準（Speed / Cross-functional）をチューニング</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate("/")}>
                設定を開く
              </Button>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
              <div>
                <Label className="text-sm font-medium">提案者管理</Label>
                <p className="text-xs text-muted-foreground mt-0.5">メンバーの追加・編集・削除</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate("/people")}>
                管理を開く
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default SettingsPage;
