// app/index.tsx
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {supabase} from '../database/supabase'

export default function HomeScreen() {

interface Task {
  id: number;
  scheduled_at: string;
  status: string;
  customer_id: number;
  cleaning_type_id: number;
  completed?: boolean;
  cleaning_type?: {
    type: string;
  };
}
interface nomeCliente {
  id : number;
  name : string;
  room:number;
  cleanliness_status:string;
}

  const [tasks, setTasks] = useState<Task[]>([]);
  const [DadosCliente, setDadosCliente] = useState<nomeCliente | null>(null);
  const customerId = 1; // Exemplo: ID do cliente logado

  useEffect(() => {
    carregarTarefasDoCliente(customerId);
    carregarNomeCliente(customerId);
  }, []);

  async function carregarNomeCliente(customerId: number) {
    if (!customerId) return;

    const { data, error } = await supabase
      .from('customer')
      .select('id, name, room, cleanliness_status')
      .eq('id', customerId)
      .single();

    if (error) {
      console.error('Erro ao procurar cliente:', error);
    } else {
      setDadosCliente(data);
      console.log('Nome do cliente carregado:', data.name);
      // Aqui você pode armazenar o nome do cliente em um estado se necessário
    }
  }

  const atualizaTask = async (id: number) => {
    // 1. Atualiza na base de dados Supabase
    const { error } = await supabase
      .from('task')
      .update({ status: 'concluído' })
      .eq('id', id);

    if (error) {
      console.error('Erro ao atualizar estado no Supabase:', error);
      alert('Erro ao concluir tarefa na base de dados.');
      return;
    }

    // 2. Remove da lista local para só manter as que "não terminou"
    setTasks(prevTasks => prevTasks.filter(t => t.id !== id));
  };

  async function carregarTarefasDoCliente(customerId: number) {
    if (!customerId) return;

    // 2. Traz os campos da 'task' e o nome do 'type' da tabela 'cleaning_type'
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

      console.log('Tarefas carregadas do cliente:', tarefasFormatadas);
      setTasks(tarefasFormatadas);
    }
  }

  const toggleTask = (id: number) => {
    setTasks(prevTasks =>
      prevTasks.map(t => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Card de Destaque do Turno Atual */}
      <View style={styles.cardAtivo}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>TURNO DE HOJE</Text>
        </View>
        <Text style={styles.roommateName}>{DadosCliente?.name || 'Nome do Cliente'}</Text>
        <Text style={styles.roomName}>📍 Cozinha & Sala de Estar</Text>
        <Text style={styles.deadline}>Prazo: Hoje, até às 21:00</Text>
      </View>

      {/* Lista de Tarefas do Cômodo */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Checklist de Limpeza</Text>
        {tasks.map(task => (
          <TouchableOpacity 
            key={task.id} 
            style={styles.taskItem} 
            onPress={() => toggleTask(task.id)}
          >
            <Ionicons 
              name={task.completed ? "checkbox" : "square-outline"} 
              size={24} 
              color={task.completed ? "#10b981" : "#94a3b8"} 
            />
            <Text style={[styles.taskText, task.completed && styles.taskCompleted]}>
              {task.cleaning_type?.type || 'Limpeza'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Botão de Registrar Conclusão */}
      <TouchableOpacity style={styles.buttonDone} onPress={() => atualizaTask(tasks.find(t => t.completed)?.id || 0)}>
        <Ionicons name="checkmark-circle" size={22} color="#fff" />
        <Text style={styles.buttonDoneText}>Marcar Limpeza como Concluída</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  cardAtivo: { backgroundColor: '#6366f1', borderRadius: 16, padding: 20, marginBottom: 24, shadowColor: '#6366f1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  badge: { backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginBottom: 12 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  roommateName: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  roomName: { color: '#e0e7ff', fontSize: 16, marginBottom: 8 },
  deadline: { color: '#c7d2fe', fontSize: 13 },
  sectionContainer: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginBottom: 12 },
  taskItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 14, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  taskText: { marginLeft: 12, fontSize: 15, color: '#334155' },
  taskCompleted: { textDecorationLine: 'line-through', color: '#94a3b8' },
  buttonDone: { backgroundColor: '#10b981', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 16, borderRadius: 14, shadowColor: '#10b981', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 3 },
  buttonDoneText: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginLeft: 8 }
});