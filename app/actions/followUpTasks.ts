"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function setSchemeStepCompleted(customerId: number, schemeStepId: number, completed: boolean) {
  const supabase = await createClient();
  await supabase.from("follow_up_task_completions").upsert(
    {
      customer_id: customerId,
      scheme_step_id: schemeStepId,
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    },
    { onConflict: "customer_id,scheme_step_id" }
  );

  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/");
}
