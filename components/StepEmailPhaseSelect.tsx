"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { StepEmailPhase } from "@/lib/types";

const PHASE_LABELS: Record<StepEmailPhase, string> = {
  pre: "プレオープン期間",
  post: "グランドオープン以降",
};

export function StepEmailPhaseSelect({ value }: { value: StepEmailPhase }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(newPhase: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("phase", newPhase);
    router.push(`/step-emails?${params.toString()}`);
  }

  return (
    <select
      value={value}
      onChange={(e) => handleChange(e.target.value)}
      className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
    >
      {(Object.keys(PHASE_LABELS) as StepEmailPhase[]).map((phase) => (
        <option key={phase} value={phase}>
          {PHASE_LABELS[phase]}
        </option>
      ))}
    </select>
  );
}
