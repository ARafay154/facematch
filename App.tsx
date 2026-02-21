// import React, { useState } from 'react';
// import { SafeAreaView, Text, TouchableOpacity, View } from 'react-native';
// import EnrollScreen from './src/screens/EnrollScreen';
// import AttendanceScreen from './src/screens/AttendanceScreen';

// export default function App() {
//   const [tab, setTab] = useState<'enroll' | 'attendance'>('enroll');

//   return (
//     <SafeAreaView style={{ flex: 1 }}>
//       <View style={{ flexDirection: 'row', gap: 10, padding: 12 }}>
//         <TouchableOpacity
//           onPress={() => setTab('enroll')}
//           style={{
//             flex: 1,
//             paddingVertical: 12,
//             borderRadius: 10,
//             backgroundColor: tab === 'enroll' ? '#111' : '#eee',
//             alignItems: 'center',
//           }}
//         >
//           <Text style={{ color: tab === 'enroll' ? '#fff' : '#111', fontWeight: '800' }}>Enroll</Text>
//         </TouchableOpacity>

//         <TouchableOpacity
//           onPress={() => setTab('attendance')}
//           style={{
//             flex: 1,
//             paddingVertical: 12,
//             borderRadius: 10,
//             backgroundColor: tab === 'attendance' ? '#111' : '#eee',
//             alignItems: 'center',
//           }}
//         >
//           <Text style={{ color: tab === 'attendance' ? '#fff' : '#111', fontWeight: '800' }}>Attendance</Text>
//         </TouchableOpacity>
//       </View>

//       <View style={{ flex: 1 }}>
//         {tab === 'enroll' ? <EnrollScreen /> : <AttendanceScreen />}
//       </View>
//     </SafeAreaView>
//   );
// }


import React, { useEffect } from 'react';
import { SafeAreaView, Text } from 'react-native';
import { loadFaceModel } from './src/utils/faceModel';

export default function App() {
  useEffect(() => {
    loadFaceModel().catch(err => {
      console.error('❌ Model load failed', err);
    });
  }, []);

  return (
    <SafeAreaView>
      <Text>Face Attendance App</Text>
    </SafeAreaView>
  );
}