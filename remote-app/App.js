import React, { useEffect } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import PairingScreen from './src/screens/PairingScreen';
import RemoteScreen from './src/screens/RemoteScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const Stack = createNativeStackNavigator();

const DarkTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#e50914',
    background: '#0a0a0f',
    card: '#13131e',
    text: '#f0f0f5',
    border: 'rgba(255,255,255,0.06)',
    notification: '#e50914',
  },
};

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer theme={DarkTheme}>
          <StatusBar style="light" backgroundColor="#0a0a0f" />
          <Stack.Navigator
            initialRouteName="Pairing"
            screenOptions={{
              headerStyle: { backgroundColor: '#13131e' },
              headerTintColor: '#f0f0f5',
              headerTitleStyle: { fontWeight: '800' },
              contentStyle: { backgroundColor: '#0a0a0f' },
            }}
          >
            <Stack.Screen
              name="Pairing"
              component={PairingScreen}
              options={{ title: 'MJMovies Remote', headerRight: () => null }}
            />
            <Stack.Screen
              name="Remote"
              component={RemoteScreen}
              options={({ route }) => ({
                title: route.params?.movieTitle || 'Control Remoto',
                headerBackTitle: 'Desconectar',
              })}
            />
            <Stack.Screen
              name="Settings"
              component={SettingsScreen}
              options={{ title: 'Configuración' }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
