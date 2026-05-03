import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function Index() {
  const [status, setStatus] = useState<"loading" | "no-session" | "no-profile" | "ready">("loading");

  useEffect(() => {
    async function check() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setStatus("no-session"); return; }

      // Check if they actually completed onboarding (have a DB profile)
      const { data } = await supabase
        .from("users")
        .select("id")
        .eq("id", session.user.id)
        .single();

      setStatus(data ? "ready" : "no-profile");
    }

    check();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session) setStatus("no-session");
        else check();
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  if (status === "loading") return null;
  if (status === "no-session") return <Redirect href="/onboarding" />;
  if (status === "no-profile") return <Redirect href="/onboarding" />;
  return <Redirect href="/(tabs)" />;
}