// app/escala.tsx
import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function EscalaScreen() {
  const escalaFutura = [
    { dia: 'Amanhã (Seg)', nome: 'Mariana Costa', comodo: 'Banheiro Social' },
    { dia: 'Terça-feira', nome: 'João Pedro', comodo: 'Área de Serviço' },
    { dia: 'Quarta-feira', nome: 'Lucas Silva', comodo: 'Cozinha' },
  ];

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.headerSubtitle}>Próximos turnos da casa</Text>

      {escalaFutura.map((item, index) => (
        <View key={index} style={styles.escalaCard}>
          <View>
            <Text style={styles.diaText}>{item.dia}</Text>
            <Text style={styles.nomeText}>{item.nome}</Text>
            <Text style={styles.comodoText}>Cômodo: {item.comodo}</Text>
          </View>
          <TouchableOpacity 
            style={styles.trocarBtn} 
            onPress={() => alert(`Solicitar troca de turno com ${item.nome}?`)}
          >
            <Ionicons name="swap-horizontal" size={18} color="#6366f1" />
            <Text style={styles.trocarText}>Trocar</Text>
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  headerSubtitle: { fontSize: 16, color: '#64748b', marginBottom: 16 },
  escalaCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  diaText: { fontSize: 12, fontWeight: 'bold', color: '#6366f1', textTransform: 'uppercase', marginBottom: 4 },
  nomeText: { fontSize: 16, fontWeight: 'bold', color: '#1e293b', marginBottom: 2 },
  comodoText: { fontSize: 13, color: '#64748b' },
  trocarBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e0e7ff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  trocarText: { color: '#6366f1', fontWeight: 'bold', marginLeft: 4, fontSize: 13 }
});