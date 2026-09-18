import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView,
  Platform, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { CameraView, Camera } from 'expo-camera';
import useRemoteStore from '../store/remoteStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function PairingScreen({ navigation }) {
  const [serverUrl, setServerUrl] = useState('http://192.168.1.7:5000');
  const [pairingCode, setPairingCode] = useState('');
  const [loading, setLoading] = useState(false);

  const [hasCameraPermission, setHasCameraPermission] = useState(null);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [scanned, setScanned] = useState(false);

  const { connect, loadSavedConfig } = useRemoteStore();

  useEffect(() => {
    loadSavedConfig().then((saved) => {
      if (saved) setServerUrl(saved);
    });
  }, []);

  async function openScanner() {
    setScanned(false);
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasCameraPermission(status === 'granted');

    if (status === 'granted') {
      setScannerVisible(true);
    } else {
      Alert.alert(
        'Permiso denegado',
        'Se necesita permiso de cámara para escanear el código QR del TV.'
      );
    }
  }

  async function handleBarCodeScanned({ data }) {
    if (scanned) return;
    setScanned(true);
    setScannerVisible(false);

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    let targetCode = data;
    let targetUrl = serverUrl;

    try {
      const parsed = JSON.parse(data);
      if (parsed.code) targetCode = String(parsed.code);
      if (parsed.serverUrl) targetUrl = parsed.serverUrl;
    } catch {
      targetCode = data.trim();
    }

    setPairingCode(targetCode);
    setServerUrl(targetUrl);

    if (targetCode.length === 6 && /^\d+$/.test(targetCode)) {
      doPair(targetUrl, targetCode);
    }
  }

  async function doPair(urlToUse, codeToUse) {
    let url = (urlToUse || '').trim().replace(/\/$/, '');
    const code = (codeToUse || '').trim();

    if (!url) return Alert.alert('Error', 'Ingresa la URL del servidor MJMovies (ej: http://192.168.1.7:5000)');

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `http://${url}`;
    }

    if (url.includes(':3000')) {
      url = url.replace(':3000', ':5000');
    } else if (url.includes(':8081')) {
      url = url.replace(':8081', ':5000');
    } else if (!url.match(/:\d+$/)) {
      url = `${url}:5000`;
    }

    if (code.length !== 6 || !/^\d+$/.test(code)) {
      return Alert.alert('Error', 'El código de emparejamiento debe ser de 6 dígitos');
    }

    setLoading(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const result = await connect(url, code);

      if (result.success) {
        await AsyncStorage.setItem('serverUrl', url);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        navigation.replace('Remote');
      } else {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Error de emparejamiento', result.error || 'Código inválido o expirado');
      }
    } catch {
      Alert.alert(
        'Error de conexión',
        'No se pudo conectar al servidor. Asegúrate de poner la URL del Backend con puerto 5000 (ej: http://192.168.1.7:5000) y que ambos dispositivos estén en el mismo Wi-Fi.'
      );
    } finally {
      setLoading(false);
    }
  }

  function handlePair() {
    doPair(serverUrl, pairingCode);
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>MJ<Text style={{ color: '#f0f0f5', opacity: 0.9 }}>Movies</Text></Text>
            <Text style={styles.logoSubtitle}>Control Remoto Digital</Text>
          </View>

          <View style={styles.instructionCard}>
            <Text style={styles.instructionTitle}>¿Cómo conectarse?</Text>
            <Text style={styles.instructionStep}>1. Abre MJMovies en tu TV o pantalla</Text>
            <Text style={styles.instructionStep}>2. Inicia la reproducción de una película</Text>
            <Text style={styles.instructionStep}>3. Haz click en el icono 📱 para ver el QR o código</Text>
            <Text style={styles.instructionStep}>4. Escanea el QR con tu cámara o ingresa los 6 dígitos</Text>
          </View>

          <TouchableOpacity
            style={styles.qrScanBtn}
            onPress={openScanner}
            accessibilityRole="button"
            accessibilityLabel="Escanear código QR en la pantalla de la TV"
          >
            <Text style={styles.qrScanBtnText}>📷 Escanear QR en Pantalla</Text>
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>O INGRESA MANUALMENTE</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>URL del Servidor MJMovies (Backend - Puerto 5000)</Text>
            <TextInput
              style={styles.input}
              value={serverUrl}
              onChangeText={setServerUrl}
              placeholder="http://192.168.1.7:5000"
              placeholderTextColor="#555577"
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              accessibilityLabel="URL del servidor MJMovies"
            />
            <Text style={styles.hint}>Usa la URL del Backend (puerto 5000, ej: http://192.168.1.7:5000)</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Código de 6 dígitos</Text>
            <TextInput
              style={[styles.input, styles.codeInput]}
              value={pairingCode}
              onChangeText={(t) => setPairingCode(t.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              placeholderTextColor="#555577"
              keyboardType="numeric"
              maxLength={6}
              returnKeyType="go"
              onSubmitEditing={handlePair}
              accessibilityLabel="Código de emparejamiento de 6 dígitos"
            />
          </View>

          <TouchableOpacity
            style={[styles.connectBtn, (loading || pairingCode.length !== 6) && styles.connectBtnDisabled]}
            onPress={handlePair}
            disabled={loading || pairingCode.length !== 6}
            accessibilityRole="button"
            accessibilityLabel="Conectar control remoto"
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.connectBtnText}>⚡ Conectar</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingsLink}
            onPress={() => navigation.navigate('Settings')}
            accessibilityRole="button"
          >
            <Text style={styles.settingsLinkText}>⚙ Configuración y Pruebas</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={scannerVisible}
        animationType="slide"
        onRequestClose={() => setScannerVisible(false)}
      >
        <SafeAreaView style={styles.scannerContainer}>
          <View style={styles.scannerHeader}>
            <Text style={styles.scannerTitle}>Apunta al código QR en tu TV</Text>
            <TouchableOpacity
              style={styles.scannerCloseBtn}
              onPress={() => setScannerVisible(false)}
            >
              <Text style={styles.scannerCloseText}>✕ Cerrar</Text>
            </TouchableOpacity>
          </View>

          {hasCameraPermission ? (
            <View style={styles.scannerBox}>
              <CameraView
                style={StyleSheet.absoluteFillObject}
                barcodeScannerSettings={{
                  barcodeTypes: ['qr'],
                }}
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
              />
              <View style={styles.scannerOverlayFrame} />
            </View>
          ) : (
            <View style={styles.permissionError}>
              <Text style={styles.permissionErrorText}>No se concedió permiso para la cámara.</Text>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  keyboardView: { flex: 1 },
  content: { padding: 24, flexGrow: 1 },

  logo: { alignItems: 'center', marginBottom: 24, marginTop: 8 },
  logoText: { fontSize: 38, fontWeight: '900', color: '#e50914', letterSpacing: -1.5 },
  logoSubtitle: { color: '#9999bb', fontSize: 13, marginTop: 4, fontWeight: '600' },

  instructionCard: {
    backgroundColor: '#13131e',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 20,
  },
  instructionTitle: { color: '#f0f0f5', fontWeight: '700', fontSize: 15, marginBottom: 8 },
  instructionStep: { color: '#9999bb', fontSize: 13, marginBottom: 4, lineHeight: 18 },

  qrScanBtn: {
    backgroundColor: '#1a1a2e',
    borderWidth: 1.5,
    borderColor: '#e50914',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#e50914',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  qrScanBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '800' },

  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  dividerText: { color: '#555577', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },

  inputGroup: { marginBottom: 16 },
  label: { color: '#9999bb', fontSize: 13, fontWeight: '600', marginBottom: 6, letterSpacing: 0.5 },

  input: {
    backgroundColor: '#1a1a2e',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    color: '#f0f0f5',
    fontSize: 15,
    padding: 13,
    fontWeight: '500',
  },
  codeInput: {
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 6,
  },
  hint: { color: '#555577', fontSize: 11, marginTop: 4 },

  connectBtn: {
    backgroundColor: '#e50914',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#e50914',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  connectBtnDisabled: { backgroundColor: '#4a1114', shadowOpacity: 0 },
  connectBtnText: { color: 'white', fontSize: 17, fontWeight: '800' },

  settingsLink: { alignItems: 'center', marginTop: 20, padding: 10 },
  settingsLinkText: { color: '#9999bb', fontSize: 13 },

  scannerContainer: { flex: 1, backgroundColor: '#000000' },
  scannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#111118',
  },
  scannerTitle: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  scannerCloseBtn: { padding: 8 },
  scannerCloseText: { color: '#e50914', fontSize: 14, fontWeight: '700' },
  scannerBox: { flex: 1, position: 'relative', justifyContent: 'center', alignItems: 'center' },
  scannerOverlayFrame: {
    width: 260,
    height: 260,
    borderWidth: 2,
    borderColor: '#e50914',
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  permissionError: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  permissionErrorText: { color: '#ff4757', textAlign: 'center', fontSize: 16 },
});
