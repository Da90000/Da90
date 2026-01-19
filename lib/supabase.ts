// Legacy export for backward compatibility
// New code should use @/lib/supabase/client or @/lib/supabase/server
import { createClient as createBrowserClient } from '@/lib/supabase/client';

// This is a client-side only export
// For server-side operations, use @/lib/supabase/server
export const supabase = typeof window !== 'undefined' 
  ? createBrowserClient()
  : null as any;