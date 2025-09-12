import { CheckCircle2, Circle, XCircle, AlertCircle, ArrowRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface DeploymentProgressBarProps {
  stage: number;
  message: string;
  isComplete: boolean;
  error: string | null;
  className?: string;
}

export default function DeploymentProgressBar({
  stage,
  message,
  isComplete,
  error,
  className,
}: DeploymentProgressBarProps) {
  // مراحل النشر
  const stages = [
    { id: 1, name: "الاتصال", icon: Circle },
    { id: 2, name: "إنشاء الحزمة", icon: Circle },
    { id: 3, name: "رفع الملفات", icon: Circle },
    { id: 4, name: "التنفيذ", icon: Circle },
    { id: 5, name: "الاكتمال", icon: Circle },
  ];

  // حساب قيمة التقدم
  const progressValue = error ? 0 : stage === 0 ? 0 : (stage / stages.length) * 100;

  return (
    <div className={cn("space-y-4", className)}>
      {error ? (
        <div className="flex items-center gap-2 text-destructive mb-2">
          <XCircle className="h-5 w-5" />
          <span className="font-medium">{error}</span>
        </div>
      ) : stage > 0 && message ? (
        <div className="flex items-center gap-2 text-primary mb-2">
          {isComplete ? (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          ) : (
            <div className="animate-pulse">
              <AlertCircle className="h-5 w-5" />
            </div>
          )}
          <span className="font-medium">{message}</span>
        </div>
      ) : null}

      <Progress value={progressValue} className="h-2" />

      <div className="flex justify-between items-center mt-2">
        {stages.map((s, index) => {
          // تحديد حالة المرحلة
          const isActive = stage >= s.id;
          const isCurrentStage = stage === s.id;
          const isCompleted = stage > s.id || isComplete;

          return (
            <div
              key={s.id}
              className={cn(
                "flex flex-col items-center relative",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center border-2",
                  isCurrentStage && !isComplete && !error
                    ? "border-primary bg-primary/10 text-primary animate-pulse"
                    : isCompleted
                    ? "border-green-500 bg-green-500/10 text-green-500"
                    : error 
                      ? "border-destructive/50 text-destructive/50"
                      : "border-muted-foreground/30 text-muted-foreground/50"
                )}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : isCurrentStage && !error ? (
                  <ArrowRight className="h-4 w-4" />
                ) : (
                  <Circle className="h-4 w-4" />
                )}
              </div>
              <span className="text-xs mt-1 whitespace-nowrap">{s.name}</span>
              
              {/* خط الاتصال بين المراحل - للمراحل ماعدا الأخيرة */}
              {index < stages.length - 1 && (
                <div
                  className={cn(
                    "absolute h-[2px] w-[calc(100%-2rem)] left-[calc(50%+1rem)] top-4 -translate-y-1/2",
                    isCompleted ? "bg-green-500" : "bg-muted-foreground/30"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}