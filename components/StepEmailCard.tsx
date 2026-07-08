import type { FollowUpSchemeStep, FollowUpTemplate } from "@/lib/types";
import { SchemeStepRow } from "@/components/SchemeStepRow";
import { TemplateEditor } from "@/components/TemplateEditor";

export function StepEmailCard({ step, template }: { step: FollowUpSchemeStep; template: FollowUpTemplate | null }) {
  return (
    <div className="space-y-2">
      <SchemeStepRow step={step} />
      {template && <TemplateEditor step={step} template={template} />}
    </div>
  );
}
