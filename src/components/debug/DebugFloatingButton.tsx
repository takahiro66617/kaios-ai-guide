import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Play, Square, Bug } from "lucide-react";
import { useDebugMode } from "./DebugModeProvider";
import DebugReportModal from "./DebugReportModal";
import { toast } from "sonner";

const DebugFloatingButton: React.FC = () => {
  const { isActive, startSession, stopSession, errorCount } = useDebugMode();
  const [modalOpen, setModalOpen] = useState(false);

  const handleStopClick = () => {
    stopSession();
    toast("デバッグセッションを終了しました");
  };

  return createPortal(
    <>
      <div
        style={{ zIndex: 2147483647 }}
        className="fixed bottom-4 right-4 flex flex-col items-end gap-2"
      >
        {isActive && (
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-destructive text-destructive-foreground text-xs font-medium shadow-lg hover:bg-destructive/90 transition-colors"
          >
            <Bug className="w-3.5 h-3.5" />
            バグ報告
          </button>
        )}

        <button
          onClick={isActive ? handleStopClick : startSession}
          className={`relative w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all ${
            isActive
              ? "bg-destructive text-destructive-foreground animate-pulse"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          }`}
        >
          {isActive ? <Square className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          {isActive && errorCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center border-2 border-background animate-pulse">
              {errorCount}
            </span>
          )}
        </button>
      </div>

      <DebugReportModal open={modalOpen} onOpenChange={setModalOpen} />
    </>,
    document.body
  );
};

export default DebugFloatingButton;
