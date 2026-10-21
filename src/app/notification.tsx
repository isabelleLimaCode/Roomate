import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../database/supabase';

interface ShiftExchangeNotification {
  id: number;
  status: 'pendente' | 'aceito' | 'recusado';
  task_id: number;
  requester_id: string;
  receiver_id: string;
  requester?: { name: string; room: number };
  task?: {
    scheduled_at: string;
    cleaning_type?: { type: string };
  };
}

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<ShiftExchangeNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      carregarNotificacoes();
    }, [])
  );

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setNotifications([]);
        setUnreadCount(0);
        setCurrentUserId(null);
      } else if (event === 'SIGNED_IN' && session) {
        carregarNotificacoes();
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  async function carregarNotificacoes() {
    try {
      setLoading(true);
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setNotifications([]);
        setUnreadCount(0);
        return;
      }

      setCurrentUserId(user.id);

      // Procura as trocas de turno associadas ao utilizador
      const { data, error } = await supabase
        .from('shift_exchange')
        .select(`
          id,
          status,
          task_id,
          requester_id,
          receiver_id,
          requester:requester_id ( name, room ),
          task:task_id (
            scheduled_at,
            cleaning_type:cleaning_type_id ( type )
          )
        `)
        .or(`receiver_id.eq.${user.id},requester_id.eq.${user.id}`)
        .order('id', { ascending: false });

      if (error) throw error;

      const formatado: ShiftExchangeNotification[] = (data || []).map((item: any) => ({
        id: item.id,
        status: item.status,
        task_id: item.task_id,
        requester_id: item.requester_id,
        receiver_id: item.receiver_id,
        requester: Array.isArray(item.requester) ? item.requester[0] : item.requester,
        task: Array.isArray(item.task)
          ? item.task[0]
          : {
              ...item.task,
              cleaning_type: Array.isArray(item.task?.cleaning_type)
                ? item.task?.cleaning_type[0]
                : item.task?.cleaning_type,
            },
      }));

      // Calcula o total de notificações pendentes enviadas PARA mim
      const pendentesParaMim = formatado.filter(
        item => item.receiver_id === user.id && item.status === 'pendente'
      ).length;

      setNotifications(formatado);
      setUnreadCount(pendentesParaMim);
    } catch (error: any) {
      console.error('Erro ao carregar notificações:', error);
      Alert.alert('Erro', 'Não foi possível carregar as tuas notificações.');
    } finally {
      setLoading(false);
    }
  }

const responderTroca = async (notificacao: ShiftExchangeNotification, aceitar: boolean) => {
    const novoStatus = aceitar ? 'aceito' : 'recusado';

    try {
      // 1. Atualiza o estado da solicitação na tabela 'shift_exchange'
      const { error: exchangeError } = await supabase
        .from('shift_exchange')
        .update({ status: novoStatus })
        .eq('id', notificacao.id);

      if (exchangeError) throw exchangeError;

      // 2. Se for aceite, transfere a tarefa para quem SOLICITOU a troca (requester_id)
      if (aceitar) {
        const { error: taskError } = await supabase
          .from('task')
          .update({ customer_id: notificacao.requester_id }) // <- AQUI: passa para o requester_id!
          .eq('id', notificacao.task_id);

        if (taskError) {
          console.error('Erro ao transferir tarefa:', taskError);
          throw taskError;
        }
      }

      Alert.alert(
        novoStatus === 'aceito' ? 'Troca Aceite 🎉' : 'Troca Recusada ❌',
        novoStatus === 'aceito'
          ? 'O turno foi transferido para o novo morador com sucesso!'
          : 'Recusaste o pedido de troca de turno.'
      );

      // Recarrega a lista de notificações
      carregarNotificacoes();
    } catch (error: any) {
      console.error('Erro ao responder à troca:', error);
      Alert.alert('Erro', `Não foi possível processar: ${error.message}`);
    }
  };
  
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await carregarNotificacoes();
    setRefreshing(false);
  }, []);

  const formatarData = (dataIso?: string) => {
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
        {/* Cabeçalho com o contador no ícone */}
        <View style={styles.headerContainer}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Notificações</Text>
            <View style={styles.iconBadgeWrapper}>
              <Ionicons name="notifications" size={26} color="#6366f1" />
              {unreadCount > 0 && (
                <View style={styles.badgeContainer}>
                  <Text style={styles.badgeText}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </View>
          </View>
          <Text style={styles.subtitle}>Pedidos de troca de turno de limpeza</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#6366f1" style={{ marginTop: 32 }} />
        ) : notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={48} color="#94a3b8" />
            <Text style={styles.emptyText}>Sem notificações pendentes.</Text>
          </View>
        ) : (
          notifications.map(item => {
            const souEURecebedor = item.receiver_id === currentUserId;
            const pendente = item.status === 'pendente';

            return (
              <View key={item.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Ionicons
                    name={souEURecebedor ? 'swap-horizontal' : 'paper-plane-outline'}
                    size={20}
                    color="#6366f1"
                  />
                  <Text style={styles.cardTitle}>
                    {souEURecebedor ? 'Pedido de Troca Recebido' : 'O teu Pedido enviado'}
                  </Text>
                </View>

                <Text style={styles.cardMessage}>
                  {souEURecebedor ? (
                    <>
                      <Text style={{ fontWeight: 'bold' }}>{item.requester?.name}</Text> (Q.{' '}
                      {item.requester?.room}) quer trocar o turno de{' '}
                      <Text style={{ fontWeight: 'bold' }}>
                        {item.task?.cleaning_type?.type || 'Limpeza'}
                      </Text>{' '}
                      do dia {formatarData(item.task?.scheduled_at)} contigo.
                    </>
                  ) : (
                    <>
                      Enviaste um pedido de troca para a tarefa de{' '}
                      <Text style={{ fontWeight: 'bold' }}>
                        {item.task?.cleaning_type?.type || 'Limpeza'}
                      </Text>{' '}
                      do dia {formatarData(item.task?.scheduled_at)}.
                    </>
                  )}
                </Text>

                {/* Ações para o morador que recebe a solicitação */}
                {souEURecebedor && pendente ? (
                  <View style={styles.actionsContainer}>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.acceptBtn]}
                      onPress={() => responderTroca(item, true)}
                    >
                      <Ionicons name="checkmark-circle" size={18} color="#fff" />
                      <Text style={styles.btnTextWhite}>Aceitar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionBtn, styles.rejectBtn]}
                      onPress={() => responderTroca(item, false)}
                    >
                      <Ionicons name="close-circle" size={18} color="#fff" />
                      <Text style={styles.btnTextWhite}>Recusar</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.statusBadge}>
                    <Text
                      style={[
                        styles.statusText,
                        item.status === 'aceito' && styles.statusAceito,
                        item.status === 'recusado' && styles.statusRecusado,
                      ]}
                    >
                      Estado: {item.status.toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: { flex: 1, backgroundColor: '#f8fafc' },
  container: { flex: 1, padding: 16 },
  headerContainer: { marginBottom: 20 },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { fontSize: 26, fontWeight: 'bold', color: '#1e293b' },
  subtitle: { fontSize: 14, color: '#64748b', marginTop: 2 },
  iconBadgeWrapper: {
    position: 'relative',
    padding: 4,
  },
  badgeContainer: {
    position: 'absolute',
    right: -2,
    top: -2,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#f8fafc',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 40 },
  emptyText: { color: '#94a3b8', marginTop: 8, fontSize: 15 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 15, fontWeight: 'bold', color: '#1e293b', marginLeft: 8 },
  cardMessage: { fontSize: 14, color: '#475569', lineHeight: 20, marginBottom: 12 },
  actionsContainer: { flexDirection: 'row', gap: 10, marginTop: 4 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  acceptBtn: { backgroundColor: '#10b981' },
  rejectBtn: { backgroundColor: '#ef4444' },
  btnTextWhite: { color: '#fff', fontWeight: 'bold', marginLeft: 6, fontSize: 14 },
  statusBadge: { marginTop: 4, alignSelf: 'flex-start' },
  statusText: { fontSize: 12, fontWeight: 'bold', color: '#f59e0b' },
  statusAceito: { color: '#10b981' },
  statusRecusado: { color: '#ef4444' },
});