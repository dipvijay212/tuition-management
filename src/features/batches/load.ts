import "server-only";
import { api } from "@/lib/api/server";

export type BatchFormOptions = {
  classes: { id: string; name: string }[];
  years: { id: string; name: string }[];
  teachers: { id: string; name: string }[];
  subjects: { id: string; name: string; class_id: string | null }[];
  defaultYear: string | null;
};

export function batchFormOptions() {
  return api<BatchFormOptions>("/batches/form-options");
}
