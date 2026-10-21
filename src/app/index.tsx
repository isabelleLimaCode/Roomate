import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../database/supabase';

interface Task {
  id: number;
  scheduled_at: string;
  status: string;
  customer_id: string;
  cleaning_type_id: number;
  completed?: boolean;
  cleaning_type?: {
    type: string;
  };
}

interface NomeCliente {
  id: string;
  name: string;
  room: number;
  cleanliness_status: string;
}

export default function HomeScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [refreshing1, setRefreshing1] = useState(false);
  const [dadosCliente, setDadosCliente] = useState<NomeCliente | null>(null);

  // 1. Recarrega os dados do utilizador atual sempre que a página ganha foco
  useFocusEffect(
    useCallback(() => {
      carregarDadosDoUtilizador();
    }, [])
  );

  // Verifica eventos de autenticação
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setDadosCliente(null);
        setTasks([]);
      } else if (event === 'SIGNED_IN' && session) {
        carregarDadosDoUtilizador();
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  async function carregarDadosDoUtilizador() {
    setDadosCliente(null);
    setTasks([]);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('Sem sessão ativa ou erro de autenticação:', authError);
      return;
    }

    const { data: clienteData, error: clienteError } = await supabase
      .from('customer')
      .select('id, name, room, cleanliness_status')
      .eq('id', user.id)
      .single();

    if (clienteError) {
      console.error('Erro ao procurar dados do cliente:', clienteError);
    } else if (clienteData) {
      setDadosCliente(clienteData);
      await carregarTarefasDoCliente(user.id);
    }
  }

  const onRefresh1 = useCallback(async () => {
    setRefreshing1(true);
    await carregarDadosDoUtilizador();
    setRefreshing1(false);
  }, []);

  async function carregarTarefasDoCliente(customerId: string) {
    if (!customerId) return;

    const { data, error } = await supabase
      .from('task')
      .select(`
        id,
        scheduled_at,
        status,
        customer_id,
        cleaning_type_id,
        cleaning_type (
          type
        )
      `)
      .eq('customer_id', customerId)
      .neq('status', 'concluído');

    if (error) {
      console.error('Erro ao procurar tarefas:', error);
      setTasks([]);
    } else {
      const tarefasFormatadas = (data || []).map((item: any) => ({
        ...item,
        completed: false,
      }));

      setTasks(tarefasFormatadas);
    }
  }

  const toggleTask = (id: number) => {
    setTasks(prevTasks =>
      prevTasks.map(t => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const concluiTarefasSelecionadas = async () => {
    const selectedIds = tasks.filter(t => t.completed).map(t => t.id);

    if (selectedIds.length === 0) {
      Alert.alert(
        'Atenção',
        'Seleciona pelo menos uma tarefa antes de concluir.'
      );
      return;
    }

    const { error } = await supabase
      .from('task')
      .update({ status: 'concluído' })
      .in('id', selectedIds);

    if (error) {
      console.error('Erro ao atualizar estado no Supabase:', error);
      Alert.alert('Erro', 'Não foi possível concluir as tarefas na base de dados.');
      return;
    }

    setTasks(prevTasks => prevTasks.filter(t => !selectedIds.includes(t.id)));
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing1}
          onRefresh={onRefresh1}
          tintColor="#6366f1"
          colors={['#6366f1']}
        />
      }
    >
      {/* Card de Destaque do Turno Atual */}
      <View style={styles.cardAtivo}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>TURNO DE HOJE</Text>
        </View>
        <Text style={styles.roommateName}>
          {dadosCliente?.name || 'A carregar...'}
        </Text>
        <Text style={styles.roomName}>
          📍 Quarto {dadosCliente?.room ? `${dadosCliente.room}` : '--'}
        </Text>
      </View>

      {/* Lista de Tarefas Organizada */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Checklist de Limpeza</Text>

        {tasks.length === 0 ? (
          <Text style={styles.emptyText}>Sem tarefas pendentes para hoje 🎉</Text>
        ) : (
          tasks.map(task => (
            <TouchableOpacity
              key={task.id}
              style={styles.taskCard}
              onPress={() => toggleTask(task.id)}
              activeOpacity={0.7}
            >
              {/* Checkbox */}
              <Ionicons
                name={task.completed ? 'checkbox' : 'square-outline'}
                size={24}
                color={task.completed ? '#10b981' : '#94a3b8'}
              />

              {/* Informações (Nome da Limpeza e Hora) */}
              <View style={styles.taskInfoContainer}>
                <Text
                  style={[
                    styles.taskTitleText,
                    task.completed && styles.taskCompletedText,
                  ]}
                >
                  {task.cleaning_type?.type || 'Limpeza Geral'}
                </Text>

                <View style={styles.taskTimeRow}>
                  <Ionicons name="time-outline" size={14} color="#64748b" />
                  <Text style={styles.taskTimeText}>
                    {new Date(task.scheduled_at).toLocaleTimeString('pt-PT', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
              </View>

              {/* Badge de Estado */}
              <View
                style={[
                  styles.statusBadge,
                  task.completed || task.status === 'concluído'
                    ? styles.statusBadgeConcluido
                    : styles.statusBadgePendente,
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    task.completed || task.status === 'concluído'
                      ? styles.statusTextConcluido
                      : styles.statusTextPendente,
                  ]}
                >
                  {task.completed || task.status === 'concluído' ? 'Concluído' : 'Pendente'}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Botão de Conclusão */}
      {tasks.length > 0 && (
        <TouchableOpacity
          style={styles.buttonDone}
          onPress={concluiTarefasSelecionadas}
          activeOpacity={0.8}
        >
          <Ionicons name="checkmark-circle" size={22} color="#fff" />
          <Text style={styles.buttonDoneText}>Marcar Limpeza como Concluída</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  cardAtivo: {
    backgroundColor: '#6366f1',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 12,
  },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  roommateName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  roomName: { color: '#e0e7ff', fontSize: 16, marginBottom: 8 },
  sectionContainer: {
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 15,
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'center',
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  taskInfoContainer: {
    flex: 1,
    marginLeft: 12,
  },
  taskTitleText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
  taskCompletedText: {
    textDecorationLine: 'line-through',
    color: '#94a3b8',
  },
  taskTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  taskTimeText: {
    fontSize: 12,
    color: '#64748b',
    marginLeft: 4,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginLeft: 8,
  },
  statusBadgeConcluido: {
    backgroundColor: '#d1fae5',
  },
  statusBadgePendente: {
    backgroundColor: '#fef3c7',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  statusTextConcluido: {
    color: '#059669',
  },
  statusTextPendente: {
    color: '#d97706',
  },
  buttonDone: {
    backgroundColor: '#10b981',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    marginTop: 8,
    marginBottom: 32,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonDoneText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});