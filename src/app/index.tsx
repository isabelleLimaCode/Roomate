import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../database/supabase';

interface Task {
  id: number;
  scheduled_at: string;
  status: string;
  customer_id: string; // Alterado para string (UUID)
  cleaning_type_id: number;
  completed?: boolean;
  cleaning_type?: {
    type: string;
  };
}

interface NomeCliente {
  id: string; // Alterado para string (UUID)
  name: string;
  room: number;
  cleanliness_status: string;
}

export default function HomeScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dadosCliente, setDadosCliente] = useState<NomeCliente | null>(null);

  useEffect(() => {
    carregarDadosDoUtilizador();
  }, []);

  async function carregarDadosDoUtilizador() {
    // 1. Obtém o utilizador atualmente autenticado no Supabase Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('Erro ao obter utilizador autenticado:', authError);
      return;
    }

    // 2. Procura os dados do cliente correspondente ao ID (UUID)
    const { data: clienteData, error: clienteError } = await supabase
      .from('customer')
      .select('id, name, room, cleanliness_status')
      .eq('id', user.id)
      .single();

    if (clienteError) {
      console.error('Erro ao procurar cliente:', clienteError);
    } else if (clienteData) {
      setDadosCliente(clienteData);
      // 3. Carrega as tarefas filtradas pelo ID do utilizador autenticado
      carregarTarefasDoCliente(user.id);
    }
  }

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

  const atualizaTask = async (id: number) => {
    if (!id) return;

    // 1. Atualiza na base de dados Supabase
    const { error } = await supabase
      .from('task')
      .update({ status: 'concluído' })
      .eq('id', id);

    if (error) {
      console.error('Erro ao atualizar estado no Supabase:', error);
      Alert.alert('Erro', 'Não foi possível concluir a tarefa na base de dados.');
      return;
    }

    // 2. Remove da lista local as tarefas concluídas
    setTasks(prevTasks => prevTasks.filter(t => t.id !== id));
  };

  return (
    <ScrollView style={styles.container}>
      {/* Card de Destaque do Turno Atual */}
      <View style={styles.cardAtivo}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>TURNO DE HOJE</Text>
        </View>
        <Text style={styles.roommateName}>{dadosCliente?.name || 'A carregar...'}</Text>
        <Text style={styles.roomName}>
          📍 Quarto {dadosCliente?.room ? `${dadosCliente.room}` : '--'} 
        </Text>
      </View>

      {/* Lista de Tarefas do Cômodo */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Checklist de Limpeza</Text>
        {tasks.length === 0 ? (
          <Text style={styles.emptyText}>Sem tarefas pendentes para hoje 🎉</Text>
        ) : (
          tasks.map(task => (
            <View key={task.id} style={styles.taskItem}>
              <Text style={[styles.taskText, task.completed && styles.taskCompleted]}>
                {task.cleaning_type?.type || 'Limpeza Geral'}
              </Text>
              
              <Switch
                trackColor={{ false: '#e2e8f0', true: '#a7f3d0' }}
                thumbColor={task.completed ? '#10b981' : '#94a3b8'}
                ios_backgroundColor="#e2e8f0"
                onValueChange={() => toggleTask(task.id)}
                value={!!task.completed}
              />
            </View>
          ))
        )}
      </View>

      {/* Botão de Registar Conclusão */}
      {tasks.length > 0 && (
        <TouchableOpacity
          style={styles.buttonDone}
          onPress={() => {
            const selectedTask = tasks.find(t => t.completed);
            if (selectedTask) {
              atualizaTask(selectedTask.id);
            } else {
              Alert.alert('Atenção', 'Ativa o botão de pelo menos uma tarefa para marcar como concluída.');
            }
          }}
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
  roommateName: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  roomName: { color: '#e0e7ff', fontSize: 16, marginBottom: 8 },
  deadline: { color: '#c7d2fe', fontSize: 13 },
  sectionContainer: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginBottom: 12 },
  emptyText: { color: '#94a3b8', fontSize: 15, fontStyle: 'italic', marginTop: 8 },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  taskText: { marginLeft: 12, fontSize: 15, color: '#334155' },
  taskCompleted: { textDecorationLine: 'line-through', color: '#94a3b8' },
  buttonDone: {
    backgroundColor: '#10b981',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonDoneText: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
});