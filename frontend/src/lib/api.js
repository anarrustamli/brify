import axios from "axios";

const BASE = process.env.REACT_APP_BACKEND_URL;
export const API = `${BASE}/api`;

const instance = axios.create({
  baseURL: API,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

// Attach Bearer from sessionStorage as fallback for browsers/devices blocking 3rd-party cookies.
// Primary auth flows through httpOnly cookies set by the backend.
instance.interceptors.request.use((config) => {
  const t = typeof window !== "undefined" ? sessionStorage.getItem("bm_token") : null;
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

export function formatApiError(detail) {
  if (detail == null) return "Xəta baş verdi";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export default instance;
