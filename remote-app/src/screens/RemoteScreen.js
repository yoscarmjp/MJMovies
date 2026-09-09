import React, { useEffect, useCallback, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Dimensions, Alert, TextInput, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import useRemoteStore from '../store/remoteStore';

const { width } = Dimensions.get('window');

export default function RemoteScreen({ navigation }) {
  const {
    sendCommand,
    seekToPosition,
    disconnect,
    tvOnline,
    isConnected,
    playerState,
  } = useRemoteStore();

  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    activateKeepAwakeAsync(); // Mantener pantalla encendida mientras el control está abierto
    return () => {
      deactivateKeepAwake();
    };
  }, []);

  useEffect(() => {
    // Si se desconecta por completo
    if (!isConnected) {
      Alert.alert(
        'Desconectado',
        'Se perdió la conexión con el servidor.',
        [{ text: 'Reconectar', onPress: () => navigation.replace('Pairing') }]
      );
    }
  }, [isConnected]);

  // Si está "Buscando TV", reintentar ping periódicamente al servidor
  useEffect(() => {
    let interval;
    if (!tvOnline && isConnected) {
      const state = useRemoteStore.getState();
      if (state.socket && state.socket.connected) {
        interval = setInterval(() => {
          state.socket.emit('remote:join', {
            tvSessionId: state.tvSessionId,
            pairingCode: state.pairingCode,
          });
          state.socket.emit('player:getState', { tvSessionId: state.tvSessionId });
        }, 2000);
      }
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [tvOnline, isConnected]);

  const cmd = useCallback(async (command, payload = {}) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await sendCommand(command, payload);
  }, [sendCommand]);

  const handleDisconnect = () => {
    Alert.alert('Desconectar', '¿Deseas desconectar el control remoto de la TV?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Desconectar',
        style: 'destructive',
        onPress: () => {
          disconnect();
          navigation.replace('Pairing');
        },
      },
    ]);
  };

  const handleSendSearch = () => {
    if (searchQuery.trim()) {
      cmd('search', { query: searchQuery.trim() });
      setSearchVisible(false);
      setSearchQuery('');
    }
  };

  function formatTime(seconds) {
    if (!seconds) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  const progress = playerState.duration
    ? (playerState.position / playerState.duration) * 100
    : 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.statusBar}>
        <View style={styles.statusLeft}>
          <View style={[styles.statusDot, { backgroundColor: tvOnline ? '#00d084' : '#ff4757' }]} />
          <Text style={styles.statusText}>
            {tvOnline ? 'TV Conectada' : 'Buscando TV...'}
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleDisconnect}
          style={styles.disconnectBtn}
          accessibilityRole="button"
          accessibilityLabel="Desconectar"
        >
          <Text style={styles.disconnectText}>✕ Salir</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.playerInfo}>
        <Text style={styles.movieTitle} numberOfLines={1}>
          {playerState.title || 'MJMovies Player'}
        </Text>
        <Text style={styles.timeText}>
          {formatTime(playerState.position)} / {formatTime(playerState.duration)}
        </Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.min(100, Math.max(0, progress))}%` }]} />
        </View>
      </View>

      <View style={styles.navBarRow}>
        <TouchableOpacity
          style={styles.navBarBtn}
          onPress={() => cmd('home')}
          accessibilityLabel="Ir al Inicio"
        >
          <Text style={styles.navBarIcon}>🏠</Text>
          <Text style={styles.navBarLabel}>Inicio</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navBarBtn, styles.searchHighlightBtn]}
          onPress={() => setSearchVisible(true)}
          accessibilityLabel="Buscar Película en TV"
        >
          <Text style={styles.navBarIcon}>🔍</Text>
          <Text style={[styles.navBarLabel, { color: '#e50914', fontWeight: 'bold' }]}>Buscar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navBarBtn}
          onPress={() => cmd('back')}
          accessibilityLabel="Volver Atrás"
        >
          <Text style={styles.navBarIcon}>↩</Text>
          <Text style={styles.navBarLabel}>Atrás</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.dpad} accessible={true} accessibilityLabel="Control de dirección">
        <TouchableOpacity
          style={styles.dpadBtn}
          onPress={() => cmd('navigate', { direction: 'up' })}
          accessibilityLabel="Arriba / Subir volumen"
        >
          <Text style={styles.dpadArrow}>▲</Text>
        </TouchableOpacity>

        <View style={styles.dpadMiddle}>
          <TouchableOpacity
            style={styles.dpadBtn}
            onPress={() => cmd('navigate', { direction: 'left' })}
            accessibilityLabel="Izquierda / Retroceder 10s"
          >
            <Text style={styles.dpadArrow}>◀</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.okBtn}
            onPress={() => cmd('select')}
            accessibilityLabel="Seleccionar / Play / Pausa"
          >
            <Text style={styles.okText}>OK</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dpadBtn}
            onPress={() => cmd('navigate', { direction: 'right' })}
            accessibilityLabel="Derecha / Adelantar 10s"
          >
            <Text style={styles.dpadArrow}>▶</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.dpadBtn}
          onPress={() => cmd('navigate', { direction: 'down' })}
          accessibilityLabel="Abajo / Bajar volumen"
        >
          <Text style={styles.dpadArrow}>▼</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.playbackRow}>
        <TouchableOpacity
          style={styles.ctrlBtn}
          onPress={() => cmd('seek', { value: -10 })}
          accessibilityLabel="Retroceder 10 segundos"
        >
          <Text style={styles.ctrlIcon}>⏪</Text>
          <Text style={styles.ctrlLabel}>10s</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.playBtn, playerState.playing ? styles.pauseBtn : styles.resumeBtn]}
          onPress={() => cmd(playerState.playing ? 'pause' : 'play')}
          accessibilityLabel={playerState.playing ? 'Pausar' : 'Reproducir'}
        >
          <Text style={styles.playIcon}>{playerState.playing ? '⏸' : '▶'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.ctrlBtn}
          onPress={() => cmd('seek', { value: 10 })}
          accessibilityLabel="Adelantar 10 segundos"
        >
          <Text style={styles.ctrlIcon}>⏩</Text>
          <Text style={styles.ctrlLabel}>10s</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.secondaryRow}>
        <TouchableOpacity
          style={styles.secBtn}
          onPress={() => cmd('volume', { value: -0.1 })}
          accessibilityLabel="Bajar volumen"
        >
          <Text style={styles.secIcon}>🔉</Text>
          <Text style={styles.secLabel}>Vol -</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secBtn}
          onPress={() => cmd('volume', { value: 0.1 })}
          accessibilityLabel="Subir volumen"
        >
          <Text style={styles.secIcon}>🔊</Text>
          <Text style={styles.secLabel}>Vol +</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secBtn}
          onPress={() => cmd('fullscreen')}
          accessibilityLabel="Pantalla completa"
        >
          <Text style={styles.secIcon}>⛶</Text>
          <Text style={styles.secLabel}>Pantalla</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secBtn}
          onPress={() => cmd('back')}
          accessibilityLabel="Volver al catálogo"
        >
          <Text style={styles.secIcon}>↩</Text>
          <Text style={styles.secLabel}>Volver</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={searchVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSearchVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.searchModalBox}>
            <Text style={styles.searchModalTitle}>🔍 Buscar Película en la TV</Text>
            <Text style={styles.searchModalSubtitle}>Escribe el título para buscarlo directamente en tu pantalla:</Text>

            <TextInput
              style={styles.searchInput}
              placeholder="Ej. Inception, Batman, Stranger Things..."
              placeholderTextColor="#666"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus={true}
              returnKeyType="search"
              onSubmitEditing={handleSendSearch}
            />

            <View style={styles.searchModalActions}>
              <TouchableOpacity
                style={styles.cancelSearchBtn}
                onPress={() => {
                  setSearchVisible(false);
                  setSearchQuery('');
                }}
              >
                <Text style={styles.cancelSearchText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmSearchBtn}
                onPress={handleSendSearch}
              >
                <Text style={styles.confirmSearchText}>Buscar en TV</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 24,
  },

  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { color: '#9999bb', fontSize: 13, fontWeight: '600' },
  disconnectBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#1a1a2e',
  },
  disconnectText: { color: '#ff4757', fontSize: 13, fontWeight: '700' },

  playerInfo: {
    width: '100%',
    paddingHorizontal: 28,
    alignItems: 'center',
    marginVertical: 12,
  },
  movieTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
  },
  timeText: { color: '#9999bb', fontSize: 13, textAlign: 'center', marginBottom: 8, fontWeight: '500' },
  progressTrack: {
    width: '100%',
    height: 4,
    backgroundColor: '#1a1a2e',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: '#e50914', borderRadius: 2 },

  // D-PAD
  dpad: { alignItems: 'center', marginVertical: 10 },
  dpadMiddle: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dpadBtn: {
    width: width * 0.22,
    height: width * 0.22,
    maxWidth: 82,
    maxHeight: 82,
    backgroundColor: '#13131e',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 4,
  },
  dpadArrow: { color: '#f0f0f5', fontSize: 22 },
  okBtn: {
    width: width * 0.24,
    height: width * 0.24,
    maxWidth: 90,
    maxHeight: 90,
    backgroundColor: '#e50914',
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#e50914',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 8,
  },
  okText: { color: 'white', fontSize: 20, fontWeight: '900' },

  // Playback
  playbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 28,
    marginVertical: 10,
  },
  ctrlBtn: { alignItems: 'center', gap: 4, padding: 8 },
  ctrlIcon: { fontSize: 26 },
  ctrlLabel: { color: '#9999bb', fontSize: 11, fontWeight: '600' },
  playBtn: {
    width: 74,
    height: 74,
    borderRadius: 37,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resumeBtn: {
    backgroundColor: '#e50914',
    shadowColor: '#e50914',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 6,
  },
  pauseBtn: {
    backgroundColor: '#1a1a2e',
    borderWidth: 2,
    borderColor: '#e50914',
  },
  playIcon: { fontSize: 32 },

  // Secondary
  secondaryRow: {
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: 16,
  },
  secBtn: {
    flex: 1,
    height: 58,
    backgroundColor: '#13131e',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  secIcon: { fontSize: 18 },
  secLabel: { color: '#9999bb', fontSize: 10, fontWeight: '600' },

  // TV Quick Nav Bar
  navBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginVertical: 4,
    width: '90%',
  },
  navBarBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#161622',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  searchHighlightBtn: {
    backgroundColor: 'rgba(229, 9, 20, 0.15)',
    borderColor: 'rgba(229, 9, 20, 0.4)',
  },
  navBarIcon: { fontSize: 15 },
  navBarLabel: { color: '#ccc', fontSize: 12, fontWeight: '600' },

  // Search Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  searchModalBox: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#12121a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    padding: 20,
    gap: 12,
  },
  searchModalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  searchModalSubtitle: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  searchInput: {
    backgroundColor: '#1a1a26',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 14,
  },
  searchModalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  cancelSearchBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#1f1f2e',
    alignItems: 'center',
  },
  cancelSearchText: {
    color: '#aaa',
    fontSize: 13,
    fontWeight: '600',
  },
  confirmSearchBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#e50914',
    alignItems: 'center',
  },
  confirmSearchText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
});
