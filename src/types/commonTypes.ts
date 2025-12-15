// Common komponentlar uchun types

export interface OrganizationSelectProps {
  value: string | null;
  onValueChange: (value: string | null) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
}

export interface StepNavigationProps {
  currentStep: number;
  totalSteps: number;
  onPrevious: () => void;
  onNext: () => void;
  onSubmit?: () => void;
  isSubmitting?: boolean;
  submitLabel?: string;
  previousLabel?: string;
  nextLabel?: string;
}

