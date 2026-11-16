import "server-only";
import { familyChildren } from "./data";

/** Children linked to the signed-in parent (scoped by the backend). */
export async function myChildren() {
  return familyChildren();
}
