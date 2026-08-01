import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);

const { error } = await supabase.auth.getSession();

if (error) {
  console.error("Error: no se pudo conectar a Supabase");
  console.error(error);
  process.exit(1);
}

console.log("OK: conexión a Supabase establecida");
