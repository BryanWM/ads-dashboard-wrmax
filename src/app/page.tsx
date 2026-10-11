import { redirect } from "next/navigation";

// Entry point. Phase 5: authenticated users go straight to /dashboard.
export default function Home() {
  redirect("/login");
}
