import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  SafeAreaView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Camera, useCameraDevice } from 'react-native-vision-camera';
import RNFS from 'react-native-fs';
import { addStudent, clearStudents, getStudents, Student } from '../utils/storage';

function uid() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export default function EnrollScreen() {
  const cameraRef = useRef<Camera>(null);
  const device = useCameraDevice('back');

  const [hasPermission, setHasPermission] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const status = await Camera.requestCameraPermission();
      setHasPermission(status === 'granted');

      const list = await getStudents();
      setStudents(list);
    })();
  }, []);

  async function ensureFolder() {
    const dir = `${RNFS.DocumentDirectoryPath}/students`;
    const exists = await RNFS.exists(dir);
    if (!exists) await RNFS.mkdir(dir);
    return dir;
  }

  async function capture() {
    if (!studentName.trim()) {
      Alert.alert('Student name required', 'Please type student name before capture.');
      return;
    }
    if (!cameraRef.current) return;

    try {
      setIsBusy(true);

      // Take photo
      const photo = await cameraRef.current.takePhoto({ flash: 'off' });

      // VisionCamera returns a path; normalize (remove file:// if present)
      const srcPath = photo.path.startsWith('file://')
        ? photo.path.replace('file://', '')
        : photo.path;

      // Copy into our app folder
      const dir = await ensureFolder();
      const filename = `${uid()}.jpg`;
      const destPath = `${dir}/${filename}`;

      await RNFS.copyFile(srcPath, destPath);

      // Save student (local)
      const item: Student = {
        id: uid(),
        name: studentName.trim(),
        photoPath: `file://${destPath}`,
        createdAt: Date.now(),
      };

      await addStudent(item);

      // Refresh list
      const list = await getStudents();
      setStudents(list);

      Alert.alert('Saved', `Photo saved for ${item.name}`);
    } catch (e: any) {
      Alert.alert('Capture failed', e?.message ?? 'Unknown error');
    } finally {
      setIsBusy(false);
    }
  }

  async function clearAll() {
    Alert.alert(
      'Clear all?',
      'This will clear the saved students list from storage.\n(Note: files will remain unless you delete them separately.)',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await clearStudents();
            setStudents([]);
          },
        },
      ]
    );
  }

  if (!device) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>No camera device found.</Text>
      </SafeAreaView>
    );
  }

  if (!hasPermission) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 }}>
        <Text style={{ textAlign: 'center' }}>
          Camera permission is required. Please allow camera access from settings.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      {/* Top controls */}
      <View style={{ padding: 12, gap: 10 }}>
        <Text style={{ fontSize: 18, fontWeight: '800' }}>Enroll (Android)</Text>

        <TextInput
          value={studentName}
          onChangeText={setStudentName}
          placeholder="Student name (e.g. Ali)"
          style={{
            borderWidth: 1,
            borderColor: '#ddd',
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 10,
          }}
        />

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity
            onPress={capture}
            disabled={isBusy}
            style={{
              flex: 1,
              backgroundColor: isBusy ? '#999' : '#111',
              paddingVertical: 12,
              borderRadius: 10,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '800' }}>
              {isBusy ? 'Saving…' : 'Capture Photo'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={clearAll}
            style={{
              paddingVertical: 12,
              paddingHorizontal: 14,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: '#ddd',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontWeight: '800' }}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Camera preview */}
      <View style={{ height: 240, marginHorizontal: 12, borderRadius: 14, overflow: 'hidden' }}>
        <Camera
          ref={cameraRef}
          style={{ flex: 1 }}
          device={device}
          isActive={true}
          photo={true}
        />
      </View>

      {/* Saved list */}
      <View style={{ flex: 1, padding: 12 }}>
        <Text style={{ fontWeight: '800', marginBottom: 8 }}>
          Students ({students.length})
        </Text>

        <FlatList
          data={students}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item }) => (
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <Image
                source={{ uri: item.photoPath }}
                style={{ width: 64, height: 64, borderRadius: 12, backgroundColor: '#eee' }}
              />
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '800' }}>{item.name}</Text>
                <Text numberOfLines={1} style={{ color: '#666', fontSize: 12 }}>
                  {item.photoPath}
                </Text>
              </View>
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  );
}