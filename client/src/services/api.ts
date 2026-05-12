import axios from "axios";

const BACKEND_URL = "https://kadastr-gis-app-1.onrender.com";

function normalizeApiBaseUrl(url?: string): string {
  const rawUrl = (url || BACKEND_URL).trim().replace(/\/+$/, "");
  return rawUrl.endsWith("/api") ? rawUrl : `${rawUrl}/api`;
}

export const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_URL);

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true
});
