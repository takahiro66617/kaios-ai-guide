import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Eye, ExternalLink, Bug } from "lucide-react";
import { toast } from "sonner";

const statusConfig: Record<string, { label: string; variant: "destructive" | "default" | "secondary" | "outline" }> = {
  open: { label: "未対応", variant: "destructive" },
  in_progress: { label: "対応中", variant: "default" },
  resolved: { label: "解決済", variant: "secondary" },
  wontfix: { label: "対応不要", variant: "outline" },
};

const DebugReportsPage = () => {
  const [filter, setFilter] = useState("all");
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["debug-reports", filter],
    queryFn: async () => {
      let query = supabase
        .from("debug_reports")
        .select("*")
        .order("created_at", { ascending: false });
      if (filter !== "all") {
        query = query.eq("status", filter);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("debug_reports").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["debug-reports"] });
      toast.success("ステータスを更新しました");
    },
  });

  const formatDate = (d: string) => new Date(d).toLocaleString("ja-JP");

  const LogSection = ({ title, logs }: { title: string; logs: any[] }) => {
    if (!logs || logs.length === 0) return null;
    return (
      <div>
        <h4 className="text-sm font-medium mb-1">{title} ({logs.length})</h4>
        <ScrollArea className="max-h-40 border rounded p-2 bg-muted/30">
          <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(logs, null, 2)}</pre>
        </ScrollArea>
      </div>
    );
  };

  return (
    <main className="flex-1 p-4 sm:p-6 overflow-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Bug className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold">バグレポート管理</h1>
          <Badge variant="secondary">{reports.length}件</Badge>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべて</SelectItem>
            <SelectItem value="open">未対応</SelectItem>
            <SelectItem value="in_progress">対応中</SelectItem>
            <SelectItem value="resolved">解決済</SelectItem>
            <SelectItem value="wontfix">対応不要</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">読み込み中...</p>
      ) : reports.length === 0 ? (
        <p className="text-muted-foreground text-sm">レポートはありません</p>
      ) : (
        <div className="space-y-3">
          {reports.map((r: any) => {
            const sc = statusConfig[r.status] || statusConfig.open;
            return (
              <Card key={r.id} className="p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={sc.variant}>{sc.label}</Badge>
                      <span className="text-xs text-muted-foreground">{formatDate(r.created_at)}</span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{r.page_url}</p>
                    {r.comment && <p className="text-sm truncate">{r.comment}</p>}
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      <span>エラー: {(r.error_logs as any[])?.length || 0}</span>
                      <span>ネットワーク: {(r.network_logs as any[])?.length || 0}</span>
                      <span>操作: {(r.interaction_logs as any[])?.length || 0}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Select
                      value={r.status}
                      onValueChange={(v) => updateStatus.mutate({ id: r.id, status: v })}
                    >
                      <SelectTrigger className="w-28 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">未対応</SelectItem>
                        <SelectItem value="in_progress">対応中</SelectItem>
                        <SelectItem value="resolved">解決済</SelectItem>
                        <SelectItem value="wontfix">対応不要</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" onClick={() => setSelectedReport(r)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>レポート詳細</DialogTitle>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">ステータス:</span>{" "}
                  <Badge variant={statusConfig[selectedReport.status]?.variant}>{statusConfig[selectedReport.status]?.label}</Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">日時:</span> {formatDate(selectedReport.created_at)}
                </div>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">ページURL:</span>{" "}
                <a href={selectedReport.page_url} target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-1">
                  {selectedReport.page_url} <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              {selectedReport.comment && (
                <div>
                  <h4 className="text-sm font-medium mb-1">コメント</h4>
                  <p className="text-sm bg-muted/30 rounded p-2">{selectedReport.comment}</p>
                </div>
              )}
              {selectedReport.screenshot_url && (
                <div>
                  <h4 className="text-sm font-medium mb-1">スクリーンショット</h4>
                  <a href={selectedReport.screenshot_url} target="_blank" rel="noreferrer">
                    <img src={selectedReport.screenshot_url} alt="Screenshot" className="max-h-48 rounded border" />
                  </a>
                </div>
              )}
              <LogSection title="エラーログ" logs={selectedReport.error_logs as any[]} />
              <LogSection title="コンソールログ" logs={selectedReport.console_logs as any[]} />
              <LogSection title="ネットワークログ" logs={selectedReport.network_logs as any[]} />
              <LogSection title="操作ログ" logs={selectedReport.interaction_logs as any[]} />
              {selectedReport.user_agent && (
                <div>
                  <h4 className="text-sm font-medium mb-1">User Agent</h4>
                  <p className="text-xs text-muted-foreground break-all">{selectedReport.user_agent}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default DebugReportsPage;
