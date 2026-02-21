import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView, Text, View } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission, useFrameProcessor } from 'react-native-vision-camera';
import { runOnJS } from 'react-native-worklets-core';
import { scanFaces } from 'react-native-vision-camera-face-detector';

type FaceBox = { x: number; y: number; width: number; height: number };

export default function TestFaceDetectScreen() {
  const device = useCameraDevice('front');
  const { hasPermission, requestPermission } = useCameraPermission();

  const [box, setBox] = useState<FaceBox | null>(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    (async () => {
      if (!hasPermission) await requestPermission();
    })();
  }, [hasPermission, requestPermission]);

  const onFaces = (faces: any[]) => {
    setCount(faces?.length ?? 0);

    if (faces && faces.length > 0) {
      // different libs expose bounds slightly differently; we handle common shapes
      const f = faces[0];
      const b =
        f.bounds ??
        f.frame ??
        f.boundingBox ??
        f.boundsRect ??
        null;

      if (b) {
        // normalize potential keys
        const x = b.x ?? b.left ?? 0;
        const y = b.y ?? b.top ?? 0;
        const width = b.width ?? (b.right != null ? b.right - x : 0);
        const height = b.height ?? (b.bottom != null ? b.bottom - y : 0);

        setBox({ x, y, width, height });
        return;
      }
    }
    setBox(null);
  };

  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    const faces = scanFaces(frame, {
      // settings are optional; keep default stable first
      // performanceMode: 'fast',
      // landmarkMode: 'none',
      // contourMode: 'none',
      // classificationMode: 'none',
    });
    runOnJS(onFaces)(faces);
  }, []);

  const statusText = useMemo(() => {
    if (count === 0) return 'No face detected';
    if (count === 1) return '1 face detected';
    return `${count} faces detected`;
  }, [count]);

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
        <Text>Camera permission required.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ padding: 12, gap: 6 }}>
        <Text style={{ fontSize: 18, fontWeight: '800' }}>Test Face Detection</Text>
        <Text style={{ color: '#666' }}>{statusText}</Text>
        <Text style={{ color: '#666', fontSize: 12 }}>
          Box: {box ? `x=${box.x.toFixed(1)} y=${box.y.toFixed(1)} w=${box.width.toFixed(1)} h=${box.height.toFixed(1)}` : '—'}
        </Text>
      </View>

      <View style={{ flex: 1, margin: 12, borderRadius: 16, overflow: 'hidden' }}>
        <Camera
          style={{ flex: 1 }}
          device={device}
          isActive={true}
          photo={true}
          frameProcessor={frameProcessor}
          frameProcessorFps={5}   // keep low for stability
        />
      </View>
    </SafeAreaView>
  );
}