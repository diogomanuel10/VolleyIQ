import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  /** Ícone (lucide-react). Renderizado num círculo. */
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: React.ReactNode;
  /** Acções: a primeira ganha destaque visual; as restantes ficam outline/ghost. */
  actions?: React.ReactNode;
  /** Extras (ex: tips, "ou importa de…"). */
  footer?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actions,
  footer,
  className,
}: EmptyStateProps) {
  return (
    <Card className={cn("border-dashed", className)}>
      <CardContent className="p-8 md:p-12 flex flex-col items-center text-center gap-4">
        <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
          <Icon className="h-7 w-7 text-primary" />
        </div>
        <div className="space-y-1.5 max-w-md">
          <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
          {description && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap gap-2 justify-center pt-1">
            {actions}
          </div>
        )}
        {footer && (
          <div className="text-xs text-muted-foreground pt-2 border-t w-full max-w-sm mt-2">
            {footer}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
