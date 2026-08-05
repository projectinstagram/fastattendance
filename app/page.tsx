import { redirect } from "next/navigation";
import { getAuthedProfile } from "@/lib/auth";

export default async function Home() {
  const profile = await getAuthedProfile();

  if (!profile) redirect("/login");
  redirect(profile.role === "teacher" ? "/teacher/dashboard" : "/student/dashboard");
}
