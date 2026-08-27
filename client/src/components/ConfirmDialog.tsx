import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
  /** Elemento que abre o diálogo (botão de lixo, "Terminar jogo", etc.). */
  trigger: ReactNode;
  title: string;
  description?: ReactNode;
  /** Texto do botão de confirmação. Default: `common.delete`. */
  confirmLabel?: string;
  cancelLabel?: string;
  /** `true` para acção destrutiva (botão vermelho). Default: `true`. */
  destructive?: boolean;
  onConfirm: () => void;
}

/**
 * Substitui o `confirm()` nativo em acções irreversíveis. O `confirm()` do
 * browser bloqueia a thread, não é estilizável e em PWA instalada aparece
 * com o chrome do sistema — mau em tablet durante um jogo.
 */
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  cancelLabel,
  destructive = true,
  onConfirm,
}: ConfirmDialogProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent className="max-w-md rounded-xl">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel>
            {cancelLabel ?? t("common.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            className={cn(
              destructive && buttonVariants({ variant: "destructive" }),
            )}
            onClick={() => {
              setOpen(false);
              onConfirm();
            }}
          >
            {confirmLabel ?? t("common.delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
