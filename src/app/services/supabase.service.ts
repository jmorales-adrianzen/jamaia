// src/app/services/supabase.service.ts
import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from 'src/environments/environment';
import { Database } from '../models/database.types';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private readonly supabase: SupabaseClient<Database>;

  constructor() {
    this.supabase = createClient<Database>(
      environment.supabaseUrl,
      environment.supabaseAnonKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    );
  }

  get client(): SupabaseClient<Database> {
    return this.supabase;
  }
}