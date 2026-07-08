import type { FollowUpSchemeStep, FollowUpTemplate } from "@/lib/types";
import { SchemeStepRow } from "@/components/SchemeStepRow";
import { TemplateEditor } from "@/components/TemplateEditor";

export function StepEmailCard({
  step,
  template,
  activeUntil,
}: {
  step: FollowUpSchemeStep;
  template: FollowUpTemplate | null;
  activeUntil: string | null;
}) {
  return (
    <div className="space-y-2">
      <SchemeStepRow step={step} activeUntil={activeUntil} />
      {template && <TemplateEditor step={step} template={template} />}
    </div>
  );
}
