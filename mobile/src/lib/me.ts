import { api } from "./api";

export type MyStats = { poisAdded: number; memoriesPosted: number; routesSearched: number };

export async function fetchMyStats(): Promise<MyStats> {
  return api<MyStats>("/me/stats");
}
