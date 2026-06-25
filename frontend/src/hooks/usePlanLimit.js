import { useEffect, useState } from "react";
import api from "@/lib/api";

// Checks whether a provider has hit their plan's limit for a resource (services,
// portfolio, case_studies, team, certifications, awards) BEFORE they fill out a
// whole create form, instead of only finding out from a 402 on submit.
export default function usePlanLimit(resourceKey, { skip = false } = {}) {
  const [state, setState] = useState({ loading: !skip, limitReached: false, limit: null, current: null, planName: "" });

  useEffect(() => {
    if (skip) { setState((s) => ({ ...s, loading: false })); return; }
    api.get("/me/plan-status").then((r) => {
      const limit = r.data?.plan?.limits?.[resourceKey];
      const current = r.data?.usage?.[resourceKey] ?? 0;
      const limitReached = limit !== undefined && limit !== null && limit !== -1 && current >= limit;
      setState({ loading: false, limitReached, limit, current, planName: r.data?.plan?.name || "" });
    }).catch(() => setState((s) => ({ ...s, loading: false })));
  }, [resourceKey, skip]);

  return state;
}
