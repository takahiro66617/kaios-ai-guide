import React, { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Camera, Upload, Send, X, Loader2 } from "lucide-react";
import { useDebugMode } from "./DebugModeProvider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import html2canvas from "html2canvas";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DebugReportModal: React.FC<Props> = ({ open, onOpenChange }) => {
  const { getSessionData, stopSession } = useDebugMode();
  const [comment, setComment] = useState("");
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [screenshotBlob, setScreenshotBlob] = useState<Blob | null>(null);
  const [sending, setSending] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sessionData = getSessionData();

  const captureScreenshot = async () => {
    setCapturing(true);
    onOpenChange(false);
    await new Promise(r => setTimeout(r, 300));
    try {
      const canvas = await html2canvas(document.body);
      canvas.toBlob(blob => {
        if (blob) {
          setScreenshotBlob(blob);
          setScreenshot(URL.createObjectURL(blob));
        }
        onOpenChange(true);
        setCapturing(false);
      }, "image/png");
    } catch {
      onOpenChange(true);
      setCapturing(false);
      toast.error("スクリーンショットの取得に失敗しました");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setScreenshotBlob(file);
      setScreenshot(URL.createObjectURL(file));
    }
  };

  const removeScreenshot = () => {
    setScreenshot(null);
    setScreenshotBlob(null);
  };

  const handleSubmit = async () => {
    if (!sessionData) return;
    setSending(true);
    try {
      let screenshotUrl: string | null = null;

      if (screenshotBlob) {
        const path = `${sessionData.sessionId}_${Date.now()}.png`;
        const { error: uploadError } = await supabase.storage
          .from("debug-screenshots")
          .upload(path, screenshotBlob, { contentType: "image/png" });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage
          .from("debug-screenshots")
          .getPublicUrl(path);
        screenshotUrl = urlData.publicUrl;
      }

      const { error } = await supabase.from("debug_reports").insert({
        session_id: sessionData.sessionId,
        page_url: window.location.href,
        user_agent: navigator.userAgent,
        comment: comment || null,
        screenshot_url: screenshotUrl,
        error_logs: sessionData.errorLogs as any,
        console_logs: sessionData.consoleLogs as any,
        network_logs: sessionData.networkLogs as any,
        interaction_logs: sessionData.interactionLogs as any,
      });
      if (error) throw error;

      toast.success("バグレポートを送信しました");
      setComment("");
      removeScreenshot();
      onOpenChange(false);
      stopSession();
    } catch (err: any) {
      toast.error("送信に失敗しました: " + err.message);
    } finally {
      setSending(false);
    }
  };

  const handleCloseWithoutReport = () => {
    stopSession();
    onOpenChange(false);
    toast("デバッグセッションを終了しました");
  };

  const canSubmit = !!(comment.trim() || screenshotBlob) && !sending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>バグレポート送信</DialogTitle>
        </DialogHeader>

        {sessionData && (
          <div className="space-y-4">
            {/* Session info */}
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="outline">Session: {sessionData.sessionId.slice(0, 20)}…</Badge>
              <Badge variant={sessionData.errorLogs.length > 0 ? "destructive" : "secondary"}>
                エラー: {sessionData.errorLogs.length}
              </Badge>
              <Badge variant="secondary">ネットワーク: {sessionData.networkLogs.length}</Badge>
              <Badge variant="secondary">操作: {sessionData.interactionLogs.length}</Badge>
            </div>

            <div className="text-xs text-muted-foreground truncate">
              ページ: {window.location.pathname}
            </div>

            {/* Comment */}
            <Textarea
              rows={4}
              placeholder="どのような操作をしたときに、どのようなバグが発生しましたか？"
              value={comment}
              onChange={e => setComment(e.target.value)}
            />

            {/* Screenshot */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={captureScreenshot} disabled={capturing}>
                  <Camera className="w-4 h-4 mr-1" />
                  {capturing ? "キャプチャ中…" : "画面キャプチャ"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="w-4 h-4 mr-1" />
                  画像アップロード
                </Button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
              </div>
              {screenshot && (
                <div className="relative inline-block">
                  <img src={screenshot} alt="Screenshot" className="max-h-48 rounded border" />
                  <button
                    onClick={removeScreenshot}
                    className="absolute top-1 right-1 bg-background/80 rounded-full p-0.5"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleCloseWithoutReport} className="w-full sm:w-auto">
            レポートせず終了
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit} className="w-full sm:w-auto">
            {sending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Send className="w-4 h-4 mr-1" />}
            送信
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DebugReportModal;
