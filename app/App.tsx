import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Platform } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import { Analytics } from '@vercel/analytics/react';

export default function App() {
  // Add minimal web-specific global styles for scrolling only
  React.useEffect(() => {
    if (Platform.OS === 'web') {
      // Inject minimal CSS to just enable scrolling without layout constraints
      const style = document.createElement('style');
      style.textContent = `
        html, body {
          overflow: auto;
          -webkit-overflow-scrolling: touch;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar style="light" />
        <AppNavigator />
        {Platform.OS === 'web' && <Analytics />}
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}