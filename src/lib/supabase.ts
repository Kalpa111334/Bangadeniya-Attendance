import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export type Database = {
  public: {
    Tables: {
      departments: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          created_at?: string;
        };
      };
      employees: {
        Row: {
          id: string;
          first_name: string;
          last_name: string;
          contact_number: string;
          department_id: string | null;
          qr_code: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          first_name: string;
          last_name: string;
          contact_number: string;
          department_id?: string | null;
          qr_code: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          first_name?: string;
          last_name?: string;
          contact_number?: string;
          department_id?: string | null;
          qr_code?: string;
          is_active?: boolean;
          created_at?: string;
        };
      };
      attendance_records: {
        Row: {
          id: string;
          employee_id: string;
          date: string;
          first_check_in: string | null;
          first_check_out: string | null;
          second_check_in: string | null;
          second_check_out: string | null;
          total_hours: number;
          is_late: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          employee_id: string;
          date: string;
          first_check_in?: string | null;
          first_check_out?: string | null;
          second_check_in?: string | null;
          second_check_out?: string | null;
          total_hours?: number;
          is_late?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          employee_id?: string;
          date?: string;
          first_check_in?: string | null;
          first_check_out?: string | null;
          second_check_in?: string | null;
          second_check_out?: string | null;
          total_hours?: number;
          is_late?: boolean;
          created_at?: string;
        };
      };
      rosters: {
        Row: {
          id: string;
          employee_id: string;
          date: string;
          shift_start: string;
          shift_end: string;
          break_duration: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          employee_id: string;
          date: string;
          shift_start: string;
          shift_end: string;
          break_duration?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          employee_id?: string;
          date?: string;
          shift_start?: string;
          shift_end?: string;
          break_duration?: number;
          created_at?: string;
        };
      };
      settings: {
        Row: {
          id: string;
          key: string;
          value: string;
          description: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          value: string;
          description?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          key?: string;
          value?: string;
          description?: string | null;
          updated_at?: string;
        };
      };
    };
  };
};