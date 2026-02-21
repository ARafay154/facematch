import React, { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Image, SafeAreaView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import {
  AttendanceSession,
  AttendanceStatus,
  Student,
  getLatestSessionForDate,
  getStudents,
  saveSession,
} from '../utils/storage';

function uid() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function todayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function AttendanceScreen() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classTitle, setClassTitle] = useState('KG-A Morning');
  const [session, setSession] = useState<AttendanceSession | null>(null);

  const dateKey = useMemo(() => todayKey(), []);

  useEffect(() => {
    (async () => {
      const list = await getStudents();
      setStudents(list);

      const existing = await getLatestSessionForDate(dateKey, classTitle);
      if (existing) setSession(existing);
      else {
        // create a fresh session
        const fresh: AttendanceSession = {
          id: uid(),
          dateKey,
          title: classTitle,
          createdAt: Date.now(),
          records: [],
        };
        setSession(fresh);
        await saveSession(fresh);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If title changes, load/create that day's session for that class
  async function loadSessionForTitle(newTitle: string) {
    setClassTitle(newTitle);

    const existing = await getLatestSessionForDate(dateKey, newTitle);
    if (existing) {
      setSession(existing);
      return;
    }
    const fresh: AttendanceSession = {
      id: uid(),
      dateKey,
      title: newTitle,
      createdAt: Date.now(),
      records: [],
    };
    setSession(fresh);
    await saveSession(fresh);
  }

  function getStatus(studentId: string): AttendanceStatus | null {
    if (!session) return null;
    const r = session.records.find(x => x.studentId === studentId);
    return r?.status ?? null;
  }

  async function mark(studentId: string, status: AttendanceStatus) {
    if (!session) return;

    const now = Date.now();
    const records = [...session.records];
    const idx = records.findIndex(r => r.studentId === studentId);

    if (idx >= 0) records[idx] = { studentId, status, markedAt: now };
    else records.push({ studentId, status, markedAt: now });

    const updated: AttendanceSession = { ...session, records };
    setSession(updated);
    await saveSession(updated);
  }

  async function resetSession() {
    if (!session) return;

    Alert.alert('Reset attendance?', `This will clear marks for "${session.title}" (${session.dateKey}).`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: async () => {
          const updated: AttendanceSession = { ...session, records: [] };
          setSession(updated);
          await saveSession(updated);
        },
      },
    ]);
  }

  const presentCount = session?.records.filter(r => r.status === 'present').length ?? 0;
  const absentCount = session?.records.filter(r => r.status === 'absent').length ?? 0;

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ padding: 12, gap: 10 }}>
        <Text style={{ fontSize: 18, fontWeight: '800' }}>Attendance</Text>

        <Text style={{ color: '#666' }}>
          Date: {dateKey} • Present: {presentCount} • Absent: {absentCount}
        </Text>

        <TextInput
          value={classTitle}
          onChangeText={loadSessionForTitle}
          placeholder="Class/Section (e.g. KG-A Morning)"
          style={{
            borderWidth: 1,
            borderColor: '#ddd',
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 10,
          }}
        />

        <TouchableOpacity
          onPress={resetSession}
          style={{
            paddingVertical: 12,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: '#ddd',
            alignItems: 'center',
          }}
        >
          <Text style={{ fontWeight: '700' }}>Reset Today’s Marks</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1, padding: 12 }}>
        {students.length === 0 ? (
          <Text style={{ color: '#666' }}>
            No students yet. Go to Enroll screen and add students first.
          </Text>
        ) : (
          <FlatList
            data={students}
            keyExtractor={(item) => item.id}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            renderItem={({ item }) => {
              const status = getStatus(item.id);

              return (
                <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                  <Image
                    source={{ uri: item.photoPath }}
                    style={{ width: 56, height: 56, borderRadius: 12, backgroundColor: '#eee' }}
                  />

                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '800' }}>{item.name}</Text>
                    <Text style={{ color: '#666', fontSize: 12 }}>
                      Status: {status ?? 'not marked'}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      onPress={() => mark(item.id, 'present')}
                      style={{
                        paddingVertical: 10,
                        paddingHorizontal: 12,
                        borderRadius: 10,
                        backgroundColor: status === 'present' ? '#111' : '#eee',
                      }}
                    >
                      <Text style={{ color: status === 'present' ? '#fff' : '#111', fontWeight: '800' }}>
                        P
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => mark(item.id, 'absent')}
                      style={{
                        paddingVertical: 10,
                        paddingHorizontal: 12,
                        borderRadius: 10,
                        backgroundColor: status === 'absent' ? '#111' : '#eee',
                      }}
                    >
                      <Text style={{ color: status === 'absent' ? '#fff' : '#111', fontWeight: '800' }}>
                        A
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}