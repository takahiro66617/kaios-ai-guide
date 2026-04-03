import { useState } from "react";
import { Sparkles, Save, Search, FileText, Tag, Building2, RefreshCw, Loader2, CheckCircle2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useKaios } from "@/contexts/KaiosContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const EXAMPLE_INPUT = "営業資料の最新版を探すのが手間だったので、全資料を社内Wikiにまとめた";

const KaizenInputPage = () => {
  const [inputText, setInputText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState("p1");
  const navigate = useNavigate();
  const { addKaizenItem, kaizenItems, people, getPersonById } = useKaios();

  const handleStructure = async () => {
    const text = inputText.trim();
    if (!text) { toast.error("テキストを入力してください"); return; }
    setIsProcessing(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("structure-kaizen", { body: { text } });
      if (error) throw new Error(error.message || "AI処理に失敗しました");
      if (data?.error) throw new Error(data.error);
      if (data?.structured) {
        setResult(data.structured);
        toast.success("AIが改善案を構造化しました");
      } else throw new Error("構造化データが返されませんでした");
    } catch (e: any) {
      console.error("Structure error:", e);
      toast.error(e.message || "AI処理中にエラーが発生しました");
    } finally { setIsProcessing(false); }
  };

  const handleSaveDraft = () => {
    if (!inputText.trim()) { toast.error("テキストを入力してください"); return; }
    setDraft(inputText);
    toast.success("下書きとして保存しました");
  };

  const handleRegisterToKnowledgeBase = () => {
    if (!result) { toast.error("先にAIで構造化してください"); return; }
    const newItem = addKaizenItem({
      title: result.title,
      problem: result.problem,
      cause: result.cause,
      solution: result.solution,
      effect: result.effect,
      department: result.department,
      category: result.category,
      reproducibility: result.reproducibility || "中",
      tags: result.tags || [],
      authorId: "p1", // current user (山田太郎 → using p1 as default for demo)
    });
    toast.success("ナレッジベースに登録しました", {
      description: `「${newItem.title}」が全社のナレッジとして共有されます`,
    });
    setResult(null);
    setInputText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey && e.key === "Enter") handleStructure();
  };

  const reproducibilityColor: Record<string, string> = {
    "高": "bg-kaios-success/10 text-kaios-success border-kaios-success/20",
    "中": "bg-primary/10 text-primary border-primary/20",
    "低": "bg-muted text-muted-foreground border-border",
  };

  // Show recent registered items
  const recentItems = kaizenItems.filter(k => k.status !== "新規").slice(0, 3);

  return (
    <main className="flex-1 bg-kaios-surface overflow-auto">
      <div className="p-6 max-w-[1100px] mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">改善入力と整理</h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-xl">
              現場での気づきや、試してみた工夫をテキストで入力してください。
              AIが自動で「課題」「原因」「解決策」などの再利用可能な形式に構造化します。
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handleSaveDraft}>
              <Save className="w-4 h-4" />
              下書きとして保存
            </Button>
            <Button size="sm" className="gap-1.5" onClick={handleRegisterToKnowledgeBase} disabled={!result}>
              <FileText className="w-4 h-4" />
              ナレッジベースに登録
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate("/similar-cases")}>
              <Search className="w-4 h-4" />
              類似事例を探す
            </Button>
          </div>
        </div>

        {/* Input Area */}
        <Card>
          <CardContent className="p-6">
            <Textarea
              placeholder="気づいた改善、試した工夫、業務で変えたことを自由に入力してください..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={6}
              className="text-base resize-none border-none shadow-none focus-visible:ring-0 p-0 placeholder:text-muted-foreground/50"
            />
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
              <div className="space-y-1">
                <button onClick={() => setInputText(EXAMPLE_INPUT)} className="flex items-center gap-1.5 text-sm text-primary hover:underline">
                  <Sparkles className="w-3.5 h-3.5" />
                  入力例: {EXAMPLE_INPUT}
                </button>
                <p className="text-xs text-muted-foreground">※ Ctrl + Enter で送信</p>
              </div>
              <Button onClick={handleStructure} disabled={isProcessing || !inputText.trim()} className="gap-2">
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                AIで構造化する
              </Button>
            </div>
          </CardContent>
        </Card>

        {draft && !result && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-4 py-2 rounded-lg">
            <Save className="w-4 h-4" />
            下書きが保存されています
            <button onClick={() => { setInputText(draft); toast.info("下書きを復元しました"); }} className="text-primary hover:underline ml-2">復元する</button>
          </div>
        )}

        {isProcessing && (
          <div className="text-center py-12">
            <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">AIが改善内容を分析・構造化しています...</p>
          </div>
        )}

        {result && !isProcessing && (
          <Card className="border-primary/20 shadow-lg">
            <CardContent className="p-6 space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="w-5 h-5 text-kaios-success" />
                    <h2 className="text-lg font-bold text-foreground">{result.title}</h2>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{result.department}</span>
                    <Badge variant="outline" className="text-xs">{result.category}</Badge>
                    <Badge variant="outline" className={`text-xs ${reproducibilityColor[result.reproducibility] || ""}`}>
                      再現性: {result.reproducibility}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <StructuredField label="課題" value={result.problem} icon="🔴" />
                <StructuredField label="原因" value={result.cause} icon="🔍" />
                <StructuredField label="解決策" value={result.solution} icon="💡" />
                <StructuredField label="効果" value={result.effect} icon="📈" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">タグ</p>
                <div className="flex flex-wrap gap-1.5">
                  {(result.tags || []).map((tag: string, i: number) => (
                    <Badge key={i} variant="secondary" className="text-xs"><Tag className="w-3 h-3 mr-1" />{tag}</Badge>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <Button size="sm" className="gap-1.5" onClick={handleRegisterToKnowledgeBase}><FileText className="w-4 h-4" />ナレッジベースに登録</Button>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { setResult(null); setInputText(""); }}><RefreshCw className="w-4 h-4" />新しい改善案を入力</Button>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate("/similar-cases")}><Search className="w-4 h-4" />類似事例を探す</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {!result && !isProcessing && (
          <>
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p className="text-base font-medium mb-1">上部の入力欄に改善内容を記述して「AIで構造化する」を押してください。</p>
            </div>

            {/* Recently registered items from shared context */}
            {recentItems.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground">最近登録された改善案</h3>
                {recentItems.map((item) => (
                  <Card key={item.id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-medium text-foreground">{item.title}</h4>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <Badge variant="outline" className="text-xs">{item.category}</Badge>
                            <span>{item.department}</span>
                            <span>{item.createdAt}</span>
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-xs">{item.status}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
};

const StructuredField = ({ label, value, icon }: { label: string; value: string; icon: string }) => (
  <div className="rounded-lg border border-border bg-muted/30 p-4">
    <p className="text-xs font-bold text-muted-foreground mb-1.5">{icon} {label}</p>
    <p className="text-sm text-foreground leading-relaxed">{value}</p>
  </div>
);

export default KaizenInputPage;
