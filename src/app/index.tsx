// app/index.tsx
import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen() {
  const [tasks, setTasks] = useState([
    { id: '1', title: 'Limepeza da casa de banho', completed: false },
    { id: '2', title: 'Limpar da cozinha', completed: false },
    { id: '3', title: 'Limpar o fogão e bancada', completed: true },
  ]);

  const toggleTask = (id: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  return (
    <ScrollView style={styles.container}>
      {/* Card de Destaque do Turno Atual */}
      <View style={styles.cardAtivo}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>TURNO DE HOJE</Text>
        </View>
        <Text style={styles.roommateName}>👤 Lucas Silva</Text>
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
              {task.title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Botão de Registrar Conclusão */}
      <TouchableOpacity style={styles.buttonDone} onPress={() => alert('Limpeza registrada com sucesso! Parabéns 🎉')}>
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