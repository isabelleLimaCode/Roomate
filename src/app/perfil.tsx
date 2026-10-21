import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../database/supabase';

interface PerfilData {
  name: string;
  room: number;
  house_id?: string | null;
  house?: {
    name: string;
    join_code: string;
  } | null;
}

export default function PerfilScreen() {
  const router = useRouter();
  const [perfil, setPerfil] = useState<PerfilData | null>(null);
  const [loading, setLoading] = useState(true);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);

  // Recarrega os dados do perfil sempre que a ecrã ganha foco
  useFocusEffect(
    useCallback(() => {
      carregarPerfil();
    }, [])
  );

  async function carregarPerfil() {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from('customer')
        .select(`
          name,
          room,
          house_id,
          house:house_id (
            name,
            join_code
          )
        `)
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Erro na query do perfil:', error.message);
        return;
      }

      if (data) {
        setPerfil({
          name: data.name,
          room: data.room,
          house_id: data.house_id,
          house: Array.isArray(data.house) ? data.house[0] : data.house,
        });
      }
    } catch (error: any) {
      console.error('Erro ao carregar perfil:', error);
    } finally {
      setLoading(false);
    }
  }

  // Função para associar o utilizador a uma casa usando o código de convite
  async function entrarNaCasa() {
    if (!joinCode.trim()) {
      Alert.alert('Atenção', 'Por favor insere um código de convite.');
      return;
    }

    try {
      setJoining(true);

      // 1. Procura a casa com o código fornecido
      const { data: casa, error: casaError } = await supabase
        .from('house')
        .select('id, name')
        .eq('join_code', joinCode.trim().toUpperCase())
        .maybeSingle();

      if (casaError || !casa) {
        Alert.alert('Erro', 'Código de casa inválido ou não encontrado.');
        return;
      }

      // 2. Associa a casa ao perfil do cliente
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error: updateError } = await supabase
        .from('customer')
        .update({ house_id: casa.id })
        .eq('id', user.id);

      if (updateError) throw updateError;

      Alert.alert('Sucesso 🎉', `Entraste na casa: ${casa.name}!`);
      setJoinCode('');
      carregarPerfil(); // Recarrega os dados do perfil
    } catch (err: any) {
      console.error('Erro ao entrar na casa:', err);
      Alert.alert('Erro', 'Não foi possível associar à casa.');
    } finally {
      setJoining(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Dados do Utilizador */}
      <View style={styles.avatarContainer}>
        <Ionicons name="person-circle-outline" size={100} color="#6366f1" />
        <Text style={styles.name}>{perfil?.name || 'Morador'}</Text>
        <Text style={styles.room}>Quarto {perfil?.room ?? '--'}</Text>
      </View>

      {/* Cartão de Dados da Casa */}
      <View style={styles.houseCard}>
        <Ionicons name="home-outline" size={24} color="#6366f1" />
        <View style={{ marginLeft: 12, flex: 1 }}>
          <Text style={styles.houseLabel}>Sua Casa</Text>
          <Text style={styles.houseName}>{perfil?.house?.name || 'Sem casa atribuída'}</Text>
          {perfil?.house?.join_code && (
            <Text style={styles.codeText}>Código de Convite: {perfil.house.join_code}</Text>
          )}
        </View>
      </View>

      {/* Se o utilizador NÃO tiver casa atribuída, mostra o campo para introduzir o código */}
      {!perfil?.house_id && (
        <View style={styles.joinContainer}>
          <Text style={styles.joinTitle}>Entrar numa Casa</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Código (ex: CASA123)"
              placeholderTextColor="#94a3b8"
              value={joinCode}
              onChangeText={setJoinCode}
              autoCapitalize="characters"
            />
            <TouchableOpacity
              style={styles.joinButton}
              onPress={entrarNaCasa}
              disabled={joining}
            >
              {joining ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.joinButtonText}>Entrar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Botão de Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#ef4444" />
        <Text style={styles.logoutText}>Terminar Sessão</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 20 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  avatarContainer: { alignItems: 'center', marginVertical: 20 },
  name: { fontSize: 24, fontWeight: 'bold', color: '#1e293b', marginTop: 8 },
  room: { fontSize: 16, color: '#64748b', marginTop: 2 },
  houseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  houseLabel: { fontSize: 12, color: '#64748b', fontWeight: 'bold' },
  houseName: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  codeText: { fontSize: 13, color: '#6366f1', marginTop: 4, fontWeight: '600' },
  joinContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 24,
  },
  joinTitle: { fontSize: 14, fontWeight: 'bold', color: '#1e293b', marginBottom: 10 },
  inputRow: { flexDirection: 'row', gap: 8 },
  input: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#1e293b',
  },
  joinButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    justifyContent: 'center',
  },
  joinButtonText: { color: '#fff', fontWeight: 'bold' },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    padding: 16,
    borderRadius: 12,
    marginTop: 'auto',
  },
  logoutText: { color: '#ef4444', fontWeight: 'bold', marginLeft: 8 },
});