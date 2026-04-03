import { HelpCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export interface HelpStep {
  icon: string;
  title: string;
  description: string;
  result?: string;
}

interface PageHelpGuideProps {
  title: string;
  overview: string;
  steps: HelpStep[];
  tips?: string[];
}

const PageHelpGuide = ({ title, overview, steps, tips }: PageHelpGuideProps) => {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 text-muted-foreground">
          <HelpCircle className="w-4 h-4" />
          使い方
        </Button>
      </SheetTrigger>
      <SheetContent className="overflow-auto">
        <SheetHeader>
          <SheetTitle className="text-lg">{title}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-6">
          <p className="text-sm text-muted-foreground leading-relaxed">{overview}</p>

          <div className="space-y-1">
            <h3 className="text-sm font-bold text-foreground">📋 使い方ステップ</h3>
            <div className="space-y-4 mt-3">
              {steps.map((step, i) => (
                <div key={i} className="relative pl-8">
                  <div className="absolute left-0 top-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                    {i + 1}
                  </div>
                  {i < steps.length - 1 && (
                    <div className="absolute left-[11px] top-7 w-px h-[calc(100%+4px)] bg-border" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {step.icon} {step.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      {step.description}
                    </p>
                    {step.result && (
                      <div className="mt-1.5 flex items-start gap-1.5 text-xs text-primary bg-primary/5 rounded px-2 py-1.5">
                        <ArrowRight className="w-3 h-3 mt-0.5 shrink-0" />
                        <span>{step.result}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {tips && tips.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-foreground">💡 ヒント</h3>
              <ul className="space-y-1.5">
                {tips.map((tip, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                    <span className="text-primary shrink-0">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default PageHelpGuide;
