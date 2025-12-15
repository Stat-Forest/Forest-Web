import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { StepNavigationProps } from "@/types/commonTypes";

export function StepNavigation({
  currentStep,
  totalSteps,
  onPrevious,
  onNext,
  onSubmit,
  isSubmitting = false,
  submitLabel,
  previousLabel,
  nextLabel,
}: StepNavigationProps) {
  const { t } = useTranslation();

  return (
    <div className="flex justify-between items-center pt-4">
      <div className="space-x-2">
        <Button
          type="button"
          variant="outline"
          onClick={onPrevious}
          disabled={currentStep === 0}
        >
          {previousLabel || t("before")}
        </Button>
        {currentStep < totalSteps - 1 && (
          <Button type="button" variant="outline" onClick={onNext}>
            {nextLabel || t("next")}
          </Button>
        )}
      </div>
      {currentStep === totalSteps - 1 && onSubmit && (
        <Button type="submit" disabled={isSubmitting} onClick={onSubmit}>
          {isSubmitting ? t("submitting") || "Yuborilmoqda..." : submitLabel || t("submit")}
        </Button>
      )}
    </div>
  );
}

