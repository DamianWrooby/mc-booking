import { createClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import type { Database } from '../supabase/database.types';

export const supabase = createClient<Database>(
  environment.supabaseUrl,
  environment.supabaseKey,
);
