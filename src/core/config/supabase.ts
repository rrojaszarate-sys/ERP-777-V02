import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const securityMode = import.meta.env.VITE_SECURITY_MODE;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ SUPABASE CONFIGURATION WARNING');
  console.warn('Missing required environment variables:');
  if (!supabaseUrl) console.warn('- VITE_SUPABASE_URL is not defined');
  if (!supabaseAnonKey) console.warn('- VITE_SUPABASE_ANON_KEY is not defined');
  console.warn('\n📝 To fix this issue:');
  console.warn('1. Create a .env file in your project root');
  console.warn('2. Add the following lines with your actual Supabase credentials:');
  console.warn('   VITE_SUPABASE_URL="https://your-project.supabase.co"');
  console.warn('   VITE_SUPABASE_ANON_KEY="your-anon-key"');
  console.warn('3. Restart your development server');
  console.warn('\n🔗 Get your credentials from: https://app.supabase.com/project/your-project/settings/api');
  console.warn('\n🔄 Application will continue with mock data until Supabase is configured');
}

// Warn about missing service role key in development mode (but don't throw error)
if (securityMode === 'development' && !supabaseServiceRoleKey) {
  console.warn('⚠️  DEVELOPMENT WARNING: VITE_SUPABASE_SERVICE_ROLE_KEY not found');
  console.warn('Administrative operations may be limited without service role key');
  console.warn('To enable full admin functionality, add to your .env file:');
  console.warn('   VITE_SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"');
  console.warn('Get your service role key from: https://app.supabase.com/project/your-project/settings/api');
}

// Validate URL format if provided
if (supabaseUrl) {
  try {
    new URL(supabaseUrl);
  } catch {
    console.warn('⚠️ INVALID SUPABASE URL');
    console.warn(`The VITE_SUPABASE_URL "${supabaseUrl}" is not a valid URL`);
    console.warn('Expected format: https://your-project.supabase.co');
    console.warn('Application will continue with mock data');
  }
}

// ⚠️ CRITICAL SECURITY WARNING ⚠️
// Using service role key in development mode to bypass RLS for administrative operations
// THIS MUST NEVER BE DEPLOYED TO PRODUCTION - IT EXPOSES FULL DATABASE ACCESS
const isDevelopment = securityMode === 'development';
const supabaseKey = isDevelopment && supabaseServiceRoleKey ? supabaseServiceRoleKey : (supabaseAnonKey || 'dummy-key');

if (isDevelopment && supabaseServiceRoleKey) {
  console.warn('⚠️  DEVELOPMENT MODE: Using service role key - NEVER deploy this to production!');
}

// Create Supabase client with fallback values to prevent crashes
export const supabase = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseKey, 
  {
  auth: {
    persistSession: !isDevelopment,
    autoRefreshToken: !isDevelopment,
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
  }
);

// Log configuration in development
if (import.meta.env.VITE_ENABLE_CONSOLE_LOGS === 'true') {
  console.log('🚀 MADE ERP v2.0 - Supabase configured');
  console.log('Mode:', securityMode);
  console.log('RLS:', import.meta.env.VITE_RLS_ENABLED);
  console.log('URL:', supabaseUrl || 'Not configured');
  console.log('Key type:', isDevelopment && supabaseServiceRoleKey ? 'SERVICE_ROLE (DEV)' : 'ANON');
  console.log('Key:', supabaseKey && supabaseKey !== 'dummy-key' ? `${supabaseKey.substring(0, 20)}...` : 'Not configured');
}

// Utility function to check if Supabase is properly configured for real data
export const isSupabaseConfiguredForRealData = (): boolean => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  return !!(
    url && 
    key && 
    !url.includes('your-project') && 
    !url.includes('placeholder.supabase.co') &&
    !key.includes('your-anon-key') &&
    key !== 'dummy-key'
  );
};