import { apiClient } from "./api";
import type { User } from "../types/gis";

export async function getCurrentUser(): Promise<User> {
  const response = await apiClient.get("/auth/me");
  return response.data.user;
}

export async function login(values: { username: string; password: string }): Promise<User> {
  const response = await apiClient.post("/auth/login", values);
  return response.data.user;
}

export async function logout(): Promise<void> {
  await apiClient.post("/auth/logout");
}
