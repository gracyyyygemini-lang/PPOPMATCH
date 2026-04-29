import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import { Platform } from 'react-native'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(
  supabaseUrl as string,
  supabaseAnonKey as string,
  {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // Web: exchange ?code= from OAuth PKCE callback. Without this, return from Microsoft leaves no session and the app loops.
    detectSessionInUrl: Platform.OS === 'web',
  },
})