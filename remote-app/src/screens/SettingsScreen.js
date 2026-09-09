import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

export default function SettingsScreen({ navigation }) {
  const [serverUrl, setServerUrl] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    AsyncStorage.getItem('serverUrl').then((url) => {
      if (url) setServerUrl(url);
    });
  }, []);

  async function save() {
    const url = serverUrl.trim().replace(/\/$/, '');
    if (!url.startsWith('http')) {
      Alert.alert('URL inválida', 'La URL debe comenzar con http:// o https://');
      return;
    }
    await AsyncStorage.setItem('serverUrl', url);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Guardado', 'Configuración guardada correctamente');
  }

  async function testConnection() {
    const url = serverUrl.trim().replace(/\/$/, '');
    if (!url.startsWith('http')) {
      Alert.alert('URL requerida', 'Ingresa una URL válida primero.');
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(`${url}/api/health`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        setTestResult({ ok: true, message: '¡Conexión exitosa con el servidor MJMovies!' });
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        setTestResult({ ok: false, message: `Servidor respondió con código ${res.status}` });
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    } catch (e) {
      setTestResult({
        ok: false,
        message: 'No se pudo conectar. Verifica que el servidor esté activo y en la misma red Wi-Fi.',
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setTesting(false);
    }
  }

  async function clearSavedData() {
    Alert.alert(
      'Restablecer',
      '¿Deseas borrar la URL guardada del servidor?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('serverUrl');
            setServerUrl('');
            setTestResult(null);
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Listo', 'Datos restablecidos');
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Servidor</Text>
        <View style={styles.card}>
          <Text style={styles.label}>URL del servidor MJMovies</Text>
          <TextInput
            style={styles.input}
            value={serverUrl}
            onChangeText={(t) => {
              setServerUrl(t);
              setTestResult(null);
            }}
            placeholder="http://192.168.1.100"
            placeholderTextColor="#555577"
            keyboardType="url"
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="URL del servidor"
          />
          <Text style={styles.hint}>
            Ingresa la IP local o dominio donde corre MJMovies
          </Text>

          {/* Test connection */}
          <TouchableOpacity
            style={styles.testBtn}
            onPress={testConnection}
            disabled={testing}
          >
            {testing ? (
              <ActivityIndicator color="#e50914" size="small" />
            ) : (
              <Text style={styles.testBtnText}>⚡ Probar conexión</Text>
            )}
          </TouchableOpacity>

          {testResult && (
            <View
              style={[
                styles.resultBanner,
                { backgroundColor: testResult.ok ? 'rgba(0,208,132,0.1)' : 'rgba(255,71,87,0.1)' },
              ]}
            >
              <Text
                style={[
                  styles.resultText,
                  { color: testResult.ok ? '#00d084' : '#ff4757' },
                ]}
              >
                {testResult.ok ? '✓ ' : '⚠ '}
                {testResult.message}
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.sectionTitle} style={{ marginTop: 24 }}>Información</Text>
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Versión</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Plataforma</Text>
            <Text style={styles.infoValue}>MJMovies Remote (Expo)</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Protocolo</Text>
            <Text style={styles.infoValue}>WebSocket + REST API</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.saveBtn}
          onPress={save}
          accessibilityRole="button"
          accessibilityLabel="Guardar configuración"
        >
          <Text style={styles.saveBtnText}>Guardar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.resetBtn}
          onPress={clearSavedData}
          accessibilityRole="button"
        >
          <Text style={styles.resetBtnText}>Restablecer datos guardados</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
        >
          <Text style={styles.backBtnText}>← Volver</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  content: { padding: 24 },
  sectionTitle: {
    color: '#9999bb',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#13131e',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 16,
  },
  label: { color: '#9999bb', fontSize: 13, marginBottom: 8 },
  input: {
    backgroundColor: '#1a1a2e',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    color: '#f0f0f5',
    fontSize: 15,
    padding: 12,
  },
  hint: { color: '#555577', fontSize: 12, marginTop: 6 },

  testBtn: {
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e50914',
    alignItems: 'center',
    backgroundColor: 'rgba(229,9,20,0.05)',
  },
  testBtnText: { color: '#e50914', fontSize: 13, fontWeight: '700' },

  resultBanner: {
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
  },
  resultText: { fontSize: 12, fontWeight: '600' },

  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  infoLabel: { color: '#9999bb', fontSize: 14 },
  infoValue: { color: '#f0f0f5', fontSize: 14, fontWeight: '600' },

  saveBtn: {
    backgroundColor: '#e50914',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnText: { color: 'white', fontSize: 16, fontWeight: '800' },

  resetBtn: {
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
  },
  resetBtnText: { color: '#ff4757', fontSize: 13, fontWeight: '600' },

  backBtn: { alignItems: 'center', marginTop: 8, padding: 12 },
  backBtnText: { color: '#9999bb', fontSize: 14 },
});
