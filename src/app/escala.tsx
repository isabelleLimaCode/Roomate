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
  customer?: {
    name: string;
    room: number;
  } | null;
  cleaning_type?: {
    type: string;
    room_number?: number;
  } | null;
}

export default function EscalaScreen() {
  const [escalas, setEscalas] = useState<EscalaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Recarrega os dados automaticamente sempre que o ecrã ganha foco
  useFocusEffect(
    useCallback(() => {
      carregarTodasEscalas();
    }, [])
  );

  useEffect(() => {
    // Escuta mudanças de sessão para limpar/recarregar os dados imediatamente
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setEscalas([]);
      } else if (event === 'SIGNED_IN' && session) {
        carregarTodasEscalas();
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  async function carregarTodasEscalas() {
    try {
      const { data, error } = await supabase
        .from('task')
        .select(`
          id,
          scheduled_at,
          status,
          customer!inner (
            id,
            name,
            room
          ),
          cleaning_type (
            id,
            type,
            room_number
          )
        `)
        .order('scheduled_at', { ascending: true });

      if (error) {
        // Fallback caso a FK com o nome 'customer' use uma sintaxe alternativa
        console.warn('Tentando busca alternativa sem alias de FK:', error.message);
        
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('task')
          .select(`
            id,
            scheduled_at,
            status,
            customer_id,
            cleaning_type_id,
            cleaning_type ( type )
          `)
          .order('scheduled_at', { ascending: true });

        if (fallbackError) throw fallbackError;

        // Procura os clientes separadamente se as FKs automáticas do PostgREST falharem
        const { data: clientes } = await supabase.from('customer').select('id, name, room');
        const clientesMap = new Map(clientes?.map(c => [c.id, c]));

        const formatado = (fallbackData || []).map((t: any) => ({
          ...t,
          customer: clientesMap.get(t.customer_id) || null,
        }));

        setEscalas(formatado as unknown as EscalaItem[]);
        return;
      }

      setEscalas((data as unknown as EscalaItem[]) || []);
    } catch (error: any) {
      console.error('Erro ao carregar escala:', error);
      Alert.alert('Erro', 'Não foi possível carregar a escala da casa.');
    } finally {
      setLoading(false);
    }
  }
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
        {/* Cabeçalho */}
        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>Escala Global</Text>
          <Text style={styles.headerSubtitle}>Próximos turnos da casa</Text>
        </View>

        {/* Indicador de Carregamento */}
        {loading ? (
          <ActivityIndicator size="large" color="#6366f1" style={{ marginTop: 32 }} />
        ) : escalas.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={48} color="#94a3b8" />
            <Text style={styles.emptyText}>Nenhuma escala agendada para a casa.</Text>
          </View>
        ) : (
          /* Lista de Turnos Agendados */
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

              <TouchableOpacity
                style={styles.trocarBtn}
                onPress={() =>
                  alert(`Solicitar troca de turno com ${item.customer?.name || 'este morador'}?`)
                }
              >
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
  headerContainer: {
    marginBottom: 20,
  },
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  diaText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#6366f1',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
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