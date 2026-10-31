export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

// Lets the layout be viewed locally before Supabase exists. Never true in a
// production build, so a deployment missing its keys stays locked.
export const isPreviewMode =
  !isSupabaseConfigured && process.env.NODE_ENV === "development";
