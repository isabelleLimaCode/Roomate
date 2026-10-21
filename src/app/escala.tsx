import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../database/supabase';

interface EscalaItem {
  id: number;
  scheduled_at: string;
  status: string;
  customer_id?: string;
  customer?: {
    id?: string;
    name: string;
    room: number;
    house_id?: string;
  } | null;
  cleaning_type?: {
    id?: number;
    type: string;
  } | null;
}

export default function EscalaScreen() {
  const [escalas, setEscalas] = useState<EscalaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      carregarTodasEscalas();
    }, [])
  );

  async function carregarTodasEscalas() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      // 1. Procura a casa do utilizador logado
      const { data: meuPerfil } = await supabase
        .from('customer')
        .select('house_id')
        .eq('id', user.id)
        .single();

      if (!meuPerfil?.house_id) {
        setEscalas([]);
        setLoading(false);
        return;
      }

      // 2. Procura apenas as tarefas de moradores da MESMA casa
      const { data, error } = await supabase
        .from('task')
        .select(`
          id,
          scheduled_at,
          status,
          customer_id,
          customer:customer_id!inner (
            id,
            name,
            room,
            house_id
          ),
          cleaning_type:cleaning_type_id (
            id,
            type
          )
        `)
        .eq('customer.house_id', meuPerfil.house_id)
        .order('scheduled_at', { ascending: true });

      if (error) throw error;

      const formatado: EscalaItem[] = (data || []).map((item: any) => ({
        id: item.id,
        scheduled_at: item.scheduled_at,
        status: item.status,
        customer_id: item.customer_id,
        customer: Array.isArray(item.customer) ? item.customer[0] : item.customer,
        cleaning_type: Array.isArray(item.cleaning_type)
          ? item.cleaning_type[0]
          : item.cleaning_type,
      }));

      setEscalas(formatado);
    } catch (error: any) {
      console.error('Erro ao carregar escala:', error);
      Alert.alert('Erro', 'Não foi possível carregar a escala da casa.');
    } finally {
      setLoading(false);
    }
  }

  const solicitarTroca = async (item: EscalaItem) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert('Erro', 'Precisas de estar autenticado.');
        return;
      }

      const donoDoTurnoId = item.customer?.id || item.customer_id;

      if (user.id === donoDoTurnoId) {
        Alert.alert('Atenção', 'Não podes pedir troca do teu próprio turno.');
        return;
      }

      if (!donoDoTurnoId) {
        Alert.alert('Erro', 'Não foi possível identificar o morador deste turno.');
        return;
      }

      const { error } = await supabase.from('shift_exchange').insert([
        {
          task_id: item.id,
          requester_id: user.id,
          receiver_id: donoDoTurnoId,
          status: 'pendente',
        },
      ]);

      if (error) throw error;

      Alert.alert('Sucesso 🚀', `Pedido de troca enviado a ${item.customer?.name || 'morador'}!`);
    } catch (error: any) {
      console.error('Erro ao pedir troca:', error);
      Alert.alert('Erro', 'Não foi possível enviar o pedido de troca.');
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await carregarTodasEscalas();
    setRefreshing(false);
  }, []);

  const formatarData = (dataIso: string) => {
    if (!dataIso) return '';
    const data = new Date(dataIso);
    return data.toLocaleDateString('pt-PT', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <View style={styles.outerContainer}>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#6366f1"
            colors={['#6366f1']}
          />
        }
      >
        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>Escala da Casa</Text>
          <Text style={styles.headerSubtitle}>Próximos turnos dos teus colegas</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#6366f1" style={{ marginTop: 32 }} />
        ) : escalas.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={48} color="#94a3b8" />
            <Text style={styles.emptyText}>Nenhuma escala agendada para a casa.</Text>
          </View>
        ) : (
          escalas.map(item => (
            <View key={item.id} style={styles.escalaCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.diaText}>{formatarData(item.scheduled_at)}</Text>
                <Text style={styles.nomeText}>
                  {item.customer?.name || 'Não Atribuído'} (Q. {item.customer?.room ?? '--'})
                </Text>
                <Text style={styles.comodoText}>
                  Tarefa: {item.cleaning_type?.type || 'Limpeza Geral'}
                </Text>
                <View style={styles.statusBadge}>
                  <Text
                    style={[
                      styles.statusText,
                      item.status === 'concluído'
                        ? styles.statusConcluido
                        : styles.statusPendente,
                    ]}
                  >
                    • {item.status}
                  </Text>
                </View>
              </View>

              <TouchableOpacity style={styles.trocarBtn} onPress={() => solicitarTroca(item)}>
                <Ionicons name="swap-horizontal" size={18} color="#6366f1" />
                <Text style={styles.trocarText}>Trocar</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: { flex: 1, backgroundColor: '#f8fafc' },
  container: { flex: 1, padding: 16 },
  headerContainer: { marginBottom: 20 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#1e293b' },
  headerSubtitle: { fontSize: 14, color: '#64748b', marginTop: 2 },
  escalaCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  diaText: { fontSize: 12, fontWeight: 'bold', color: '#6366f1', textTransform: 'uppercase', marginBottom: 4 },
  nomeText: { fontSize: 16, fontWeight: 'bold', color: '#1e293b', marginBottom: 2 },
  comodoText: { fontSize: 13, color: '#64748b' },
  statusBadge: { marginTop: 6 },
  statusText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  statusConcluido: { color: '#10b981' },
  statusPendente: { color: '#f59e0b' },
  trocarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  trocarText: { color: '#6366f1', fontWeight: 'bold', marginLeft: 4, fontSize: 13 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 40 },
  emptyText: { color: '#94a3b8', marginTop: 8, fontSize: 15 },
});