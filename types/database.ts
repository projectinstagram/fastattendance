export type UserRole = "student" | "teacher";
export type AttendanceStatus = "present" | "late" | "absent";
export type SecurityEventType =
  | "INVALID_ROLL_NUMBER"
  | "INVALID_SESSION"
  | "EXPIRED_QR"
  | "DUPLICATE_ATTENDANCE"
  | "UNAUTHORIZED_ATTENDANCE"
  | "LOCATION_OUT_OF_RANGE"
  | "WRONG_CLASS";

export interface Profile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export interface Student {
  id: string;
  profile_id: string;
  roll_number: string;
  department: string;
  semester: number;
  section: string;
  created_at: string;
}

export interface Teacher {
  id: string;
  profile_id: string;
  created_at: string;
}

export interface ClassRow {
  id: string;
  name: string;
  subject: string;
  department: string;
  semester: number;
  section: string;
  teacher_id: string;
  created_at: string;
}

export interface ClassStudent {
  class_id: string;
  student_id: string;
}

export interface AttendanceSession {
  id: string;
  class_id: string;
  teacher_id: string;
  subject: string;
  start_time: string;
  late_after: string;
  end_time: string;
  is_active: boolean;
  qr_token_hash: string | null;
  qr_expires_at: string | null;
  qr_refresh_seconds: number;
  session_code: string;
  require_location: boolean;
  classroom_lat: number | null;
  classroom_lng: number | null;
  location_radius_m: number | null;
  created_at: string;
}

export interface AttendanceRecord {
  id: string;
  session_id: string;
  student_id: string;
  roll_number: string;
  marked_at: string;
  status: AttendanceStatus;
  location_verified: boolean | null;
  created_at: string;
}

export interface SecurityEvent {
  id: string;
  student_id: string | null;
  session_id: string | null;
  event_type: SecurityEventType;
  details: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

/** Postgrest-js requires every table to declare its Row/Insert/Update/Relationships shape explicitly. */
type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      profiles: Table<Profile>;
      students: Table<Student>;
      teachers: Table<Teacher>;
      classes: Table<ClassRow>;
      class_students: Table<ClassStudent>;
      attendance_sessions: Table<AttendanceSession>;
      attendance_records: Table<AttendanceRecord>;
      security_events: Table<SecurityEvent>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
