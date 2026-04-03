import React, { useState, useEffect, useCallback, useRef } from "react";
import { X, ChevronRight, ChevronLeft, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createPortal } from "react-dom";

export interface TourStep {
  selector: string;
  title: string;
  description: string;
  position?: "top" | "bottom" | "left" | "right";
}

interface UITourProps {
  steps: TourStep[];
  tourKey: string; // unique key per page to track dismissal
}

const UITour = ({ steps, tourKey }: UITourProps) => {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const updateRect = useCallback(() => {
    if (!isActive || !steps[currentStep]) return;
    const el = document.querySelector(steps[currentStep].selector);
    if (el) {
      setRect(el.getBoundingClientRect());
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      setRect(null);
    }
  }, [isActive, currentStep, steps]);

  useEffect(() => {
    updateRect();
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);
    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [updateRect]);

  const start = () => {
    setCurrentStep(0);
    setIsActive(true);
  };

  const close = () => {
    setIsActive(false);
    setCurrentStep(0);
  };

  const next = () => {
    if (currentStep < steps.length - 1) setCurrentStep(c => c + 1);
    else close();
  };

  const prev = () => {
    if (currentStep > 0) setCurrentStep(c => c - 1);
  };

  const step = steps[currentStep];
  const padding = 8;

  // Calculate tooltip position
  const getTooltipStyle = (): React.CSSProperties => {
    if (!rect) return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
    const pos = step?.position || "bottom";
    switch (pos) {
      case "top":
        return { bottom: window.innerHeight - rect.top + padding + 12, left: rect.left + rect.width / 2, transform: "translateX(-50%)" };
      case "left":
        return { top: rect.top + rect.height / 2, right: window.innerWidth - rect.left + padding + 12, transform: "translateY(-50%)" };
      case "right":
        return { top: rect.top + rect.height / 2, left: rect.right + padding + 12, transform: "translateY(-50%)" };
      default: // bottom
        return { top: rect.bottom + padding + 12, left: rect.left + rect.width / 2, transform: "translateX(-50%)" };
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" className="gap-1.5" onClick={start}>
        <HelpCircle className="w-4 h-4" />
        使い方
      </Button>

      {isActive && createPortal(
        <div className="fixed inset-0 z-[9999]" onClick={close}>
          {/* Overlay with spotlight cutout using CSS clip-path */}
          <div
            className="absolute inset-0 bg-black/60 transition-all duration-300"
            style={rect ? {
              clipPath: `polygon(
                0% 0%, 0% 100%, 
                ${rect.left - padding}px 100%, 
                ${rect.left - padding}px ${rect.top - padding}px, 
                ${rect.right + padding}px ${rect.top - padding}px, 
                ${rect.right + padding}px ${rect.bottom + padding}px, 
                ${rect.left - padding}px ${rect.bottom + padding}px, 
                ${rect.left - padding}px 100%, 
                100% 100%, 100% 0%
              )`,
            } : undefined}
          />

          {/* Highlight border */}
          {rect && (
            <div
              className="absolute border-2 border-primary rounded-lg pointer-events-none animate-pulse"
              style={{
                top: rect.top - padding,
                left: rect.left - padding,
                width: rect.width + padding * 2,
                height: rect.height + padding * 2,
              }}
            />
          )}

          {/* Tooltip */}
          <div
            ref={tooltipRef}
            className="absolute bg-card border border-border shadow-2xl rounded-xl p-5 max-w-sm z-10"
            style={getTooltipStyle()}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-primary">
                ステップ {currentStep + 1} / {steps.length}
              </span>
              <button onClick={close} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <h3 className="text-sm font-bold text-foreground mb-1">{step?.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">{step?.description}</p>
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={prev} disabled={currentStep === 0} className="gap-1">
                <ChevronLeft className="w-3 h-3" />
                前へ
              </Button>
              <div className="flex gap-1">
                {steps.map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full transition-colors ${i === currentStep ? "bg-primary" : "bg-muted-foreground/30"}`}
                  />
                ))}
              </div>
              <Button size="sm" onClick={next} className="gap-1">
                {currentStep === steps.length - 1 ? "完了" : "次へ"}
                {currentStep < steps.length - 1 && <ChevronRight className="w-3 h-3" />}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default UITour;
