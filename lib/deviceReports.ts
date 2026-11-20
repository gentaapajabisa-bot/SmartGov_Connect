export interface SavedDeviceReport {
  id: number;
  ticket_no: string;
  device_token: string;
  title?: string;
  created_at: string;
}

const STORAGE_KEY = "sgc_anon_reports_v1";
const VOTER_KEY = "sgc_anon_voter_v1";

export function getSavedDeviceReports(): SavedDeviceReport[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveDeviceReport(item: SavedDeviceReport) {
  if (typeof window === "undefined") return;
  const current = getSavedDeviceReports();
  const next = [item, ...current.filter((r) => r.ticket_no !== item.ticket_no)];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function getDeviceTokenForReport(idOrTicket: number | string): string | null {
  const list = getSavedDeviceReports();
  const found = list.find((r) => r.id === idOrTicket || r.ticket_no === idOrTicket);
  return found?.device_token ?? null;
}

export function getOrCreateVoterKey(): string {
  if (typeof window === "undefined") return "anon";
  let key = localStorage.getItem(VOTER_KEY);
  if (!key) {
    key = typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(VOTER_KEY, key);
  }
  return key;
}
