import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  LayoutChangeEvent,
  SafeAreaView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Camera, runAsync, useCameraDevice, useFrameProcessor } from 'react-native-vision-camera';
import { Worklets } from 'react-native-worklets-core';
import RNFS from 'react-native-fs';
import {
  Face,
  FrameFaceDetectionOptions,
  useFaceDetector,
} from 'react-native-vision-camera-face-detector';
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
  const [faces, setFaces] = useState<Face[]>([]);
  const [previewSize, setPreviewSize] = useState({ width: 1, height: 1 });
  const lastFaceUpdateMs = useRef(0);

  const faceDetectionOptions = useMemo<FrameFaceDetectionOptions>(
    () => ({
      performanceMode: 'fast',
      landmarkMode: 'none',
      contourMode: 'none',
      classificationMode: 'none',
      minFaceSize: 0.15,
      trackingEnabled: true,
      cameraFacing: 'back',
      autoMode: true,
      windowWidth: previewSize.width,
      windowHeight: previewSize.height,
    }),
    [previewSize.height, previewSize.width],
  );

  const { detectFaces, stopListeners } = useFaceDetector(faceDetectionOptions);

  useEffect(() => {
    return () => {
      stopListeners();
    };
  }, [stopListeners]);

  const handleDetectedFaces = useMemo(
    () =>
      Worklets.createRunOnJS((detectedFaces: Face[]) => {
        const now = Date.now();
        if (now - lastFaceUpdateMs.current < 120) return;
        lastFaceUpdateMs.current = now;
        setFaces(detectedFaces);
      }),
    [],
  );

  const frameProcessor = useFrameProcessor(
    (frame) => {
      'worklet';
      runAsync(frame, () => {
        'worklet';
        const detectedFaces = detectFaces(frame);
        handleDetectedFaces(detectedFaces);
      });
    },
    [detectFaces, handleDetectedFaces],
  );

  useEffect(() => {
    (async () => {
      const status = await Camera.requestCameraPermission();
      setHasPermission(status === 'granted');

      const list = await getStudents();
      setStudents(list);
    })();
  }, []);

  function onPreviewLayout(event: LayoutChangeEvent) {
    const { width, height } = event.nativeEvent.layout;
    const normalizedWidth = width > 0 ? width : 1;
    const normalizedHeight = height > 0 ? height : 1;
    if (
      Math.round(normalizedWidth) === Math.round(previewSize.width) &&
      Math.round(normalizedHeight) === Math.round(previewSize.height)
    ) {
      return;
    }
    setPreviewSize({ width: normalizedWidth, height: normalizedHeight });
  }

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
      <View
        style={{ height: 240, marginHorizontal: 12, borderRadius: 14, overflow: 'hidden' }}
        onLayout={onPreviewLayout}
      >
        <Camera
          ref={cameraRef}
          style={{ flex: 1 }}
          device={device}
          isActive={true}
          photo={true}
          frameProcessor={frameProcessor}
        />
        {faces[0] ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: Math.max(0, faces[0].bounds.x),
              top: Math.max(0, faces[0].bounds.y),
              width: Math.max(1, faces[0].bounds.width),
              height: Math.max(1, faces[0].bounds.height),
              borderWidth: 2,
              borderColor: '#00C853',
              borderRadius: 10,
              backgroundColor: 'transparent',
            }}
          />
        ) : null}
      </View>

      <View style={{ paddingHorizontal: 12, paddingTop: 8 }}>
        <Text style={{ color: '#333', fontWeight: '700' }}>Faces detected: {faces.length}</Text>
        <Text style={{ color: '#666', fontSize: 12 }}>
          {faces[0]
            ? `Box: x=${Math.round(faces[0].bounds.x)}, y=${Math.round(faces[0].bounds.y)}, w=${Math.round(faces[0].bounds.width)}, h=${Math.round(faces[0].bounds.height)}`
            : 'No face in frame'}
        </Text>
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
