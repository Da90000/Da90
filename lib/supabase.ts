// Legacy export for backward compatibility
// New code should use @/lib/supabase/client or @/lib/supabase/server
import { createClient as createBrowserClient } from '@/lib/supabase/client';

// This is a client-side only export
// For server-side operations, use @/lib/supabase/server
// Create a singleton instance for backward compatibility
let supabaseInstance: ReturnType<typeof createBrowserClient> | null = null;

export const supabase = typeof window !== 'undefined' 
  ? (supabaseInstance || (supabaseInstance = createBrowserClient()))
  : null as any;