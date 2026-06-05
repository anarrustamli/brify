export function adminListItems(payload) {
  if (Array.isArray(payload)) return payload;
  return payload?.items || [];
}

export function adminListTotal(payload) {
  if (Array.isArray(payload)) return payload.length;
  return Number(payload?.total || 0);
}

export function adminListMeta(payload) {
  return {
    items: adminListItems(payload),
    total: adminListTotal(payload),
    page: Number(payload?.page || 1),
    limit: Number(payload?.limit || 25),
  };
}
