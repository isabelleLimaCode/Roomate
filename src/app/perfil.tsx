import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../database/supabase';

interface PerfilData {
  name: string;
  room: number;
  house?: {
    name: string;
    join_code: string;
  };
}

export default function PerfilScreen() {
  const router = useRouter();
  const [perfil, setPerfil] = useState<PerfilData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarPerfil();
  }, []);

  async function carregarPerfil() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from('customer')
        .select(`
          name,
          room,
          house:house_id (
            name,
            join_code
          )
        `)
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setPerfil({
        name: data.name,
        room: data.room,
        house: Array.isArray(data.house) ? data.house[0] : data.house,
      });
    } catch (error: any) {
      console.error('Erro ao carregar perfil:', error);
    } finally {
      setLoading(false);
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
  avatarContainer: { alignItems: 'center', marginVertical: 24 },
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
    marginBottom: 24,
  },
  houseLabel: { fontSize: 12, color: '#64748b', fontWeight: 'bold' },
  houseName: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  codeText: { fontSize: 13, color: '#6366f1', marginTop: 4, fontWeight: '600' },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    padding: 16,
    borderRadius: 12,
  },
  logoutText: { color: '#ef4444', fontWeight: 'bold', marginLeft: 8 },
});