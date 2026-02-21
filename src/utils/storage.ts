import AsyncStorage from '@react-native-async-storage/async-storage';

const STUDENTS_KEY = 'STUDENTS_V1';
const ATTENDANCE_KEY = 'ATTENDANCE_V1';

export type Student = {
  id: string;
  name: string;
  photoPath: string; // file://...
  createdAt: number;
};

export type AttendanceStatus = 'present' | 'absent';

export type AttendanceRecord = {
  studentId: string;
  status: AttendanceStatus;
  markedAt: number;
};

export type AttendanceSession = {
  id: string;
  dateKey: string; // e.g. 2026-02-21
  title: string;   // e.g. "KG-A Morning"
  createdAt: number;
  records: AttendanceRecord[];
};

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

// ---------- Students ----------
export async function getStudents(): Promise<Student[]> {
  const raw = await AsyncStorage.getItem(STUDENTS_KEY);
  return safeParse<Student[]>(raw, []);
}

export async function addStudent(student: Student): Promise<void> {
  const list = await getStudents();
  list.unshift(student);
  await AsyncStorage.setItem(STUDENTS_KEY, JSON.stringify(list));
}

export async function clearStudents(): Promise<void> {
  await AsyncStorage.removeItem(STUDENTS_KEY);
}

// ---------- Attendance ----------
export async function getSessions(): Promise<AttendanceSession[]> {
  const raw = await AsyncStorage.getItem(ATTENDANCE_KEY);
  return safeParse<AttendanceSession[]>(raw, []);
}

export async function saveSession(session: AttendanceSession): Promise<void> {
  const list = await getSessions();
  const idx = list.findIndex(s => s.id === session.id);
  if (idx >= 0) list[idx] = session;
  else list.unshift(session);
  await AsyncStorage.setItem(ATTENDANCE_KEY, JSON.stringify(list));
}

export async function getLatestSessionForDate(dateKey: string, title: string): Promise<AttendanceSession | null> {
  const list = await getSessions();
  const found = list.find(s => s.dateKey === dateKey && s.title === title);
  return found ?? null;
}

export async function clearSessions(): Promise<void> {
  await AsyncStorage.removeItem(ATTENDANCE_KEY);
}