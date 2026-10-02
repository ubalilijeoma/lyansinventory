import { createClient } from '@supabase/supabase-js';

// Universal environment accessor (Vite import.meta.env or Node process.env)
const env =
  typeof import.meta !== 'undefined' && import.meta.env
    ? import.meta.env
    : typeof process !== 'undefined' && process.env
    ? process.env
    : {};

// Retrieve environment credentials
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey =
  env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY;
const projectId = env.VITE_SUPABASE_PROJECT_ID;

// Production sanity validation
const isConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isConfigured && typeof window !== 'undefined') {
  console.warn(
    '[Lyans Supabase] Configuration Incomplete: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be defined in your .env file.'
  );
}

/**
 * Enterprise Supabase Client Singleton
 * Configured with automatic session persistence, token refresh, and realtime parameters.
 */
export const supabase = isConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
      global: {
        headers: {
          'x-application-name': 'lyans-woman-inventory',
        },
      },
    })
  : null;

/**
 * Diagnostic Health Check
 * Verifies connectivity to the Supabase REST endpoint and detects if project is paused or offline.
 *
 * @returns {Promise<{ ok: boolean, status: string, message: string }>}
 */
export async function checkSupabaseHealth() {
  if (!isConfigured || !supabase) {
    return {
      ok: false,
      status: 'MISCONFIGURED',
      message: 'Supabase credentials are missing or incomplete in .env.',
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'GET',
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      return {
        ok: true,
        status: 'CONNECTED',
        message: 'Connected to Supabase PostgreSQL cluster.',
      };
    }

    if (response.status === 540 || response.status === 503) {
      return {
        ok: false,
        status: 'PAUSED',
        message:
          'Supabase project appears paused or in standby. Please resume it in the Supabase Dashboard.',
      };
    }

    return {
      ok: false,
      status: `HTTP_${response.status}`,
      message: `Supabase returned status ${response.status}: ${response.statusText}`,
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      return {
        ok: false,
        status: 'TIMEOUT',
        message: 'Connection timed out while reaching Supabase host.',
      };
    }

    return {
      ok: false,
      status: 'OFFLINE_OR_PAUSED',
      message: error.message || 'Host resolution failed (Project may be paused).',
    };
  }
}

export { projectId, supabaseUrl };
