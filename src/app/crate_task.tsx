import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../database/supabase';

interface Customer {
  id: string; // UUID
  name: string;
  room: number;
}

interface CleaningType {
  id: number;
  type: string;
}

export default function CreateTaskScreen() {
  const router = useRouter();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cleaningTypes, setCleaningTypes] = useState<CleaningType[]>([]);

  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedCleaningTypeId, setSelectedCleaningTypeId] = useState<number | null>(null);
  const [scheduledAt, setScheduledAt] = useState<Date>(new Date());

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);

  useEffect(() => {
    carregarDadosFormulario();
  }, []);

  async function carregarDadosFormulario() {
    setFetchingData(true);
    try {
      // 1. Procura a lista de clientes / roommates
      const { data: customerData, error: customerError } = await supabase
        .from('customer')
        .select('id, name, room');

      if (customerError) throw customerError;

      // 2. Procura os tipos de limpeza disponíveis
      const { data: typeData, error: typeError } = await supabase
        .from('cleaning_type')
        .select('id, type');

      if (typeError) throw typeError;

      setCustomers(customerData || []);
      setCleaningTypes(typeData || []);
    } catch (error: any) {
      console.error('Erro ao carregar dados:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados para criar a tarefa.');
    } finally {
      setFetchingData(false);
    }
  }

  async function handleCreateTask() {
    if (!selectedCustomerId) {
      Alert.alert('Atenção', 'Por favor, seleciona o roommate responsável.');
      return;
    }

    if (!selectedCleaningTypeId) {
      Alert.alert('Atenção', 'Por favor, seleciona o tipo de limpeza.');
      return;
    }

    setLoading(true);

    // Insere a nova tarefa na tabela 'task'
    const { error } = await supabase.from('task').insert([
      {
        scheduled_at: scheduledAt.toISOString(),
        status: 'nao terminou', // Estado inicial por padrão
        customer_id: selectedCustomerId,
        cleaning_type_id: selectedCleaningTypeId,
      },
    ]);

    setLoading(false);

    if (error) {
      console.error('Erro detalhado do Supabase:', JSON.stringify(error, null, 2));
      Alert.alert('Erro', `Falha ao guardar: ${error.message}`);
    } else {
      Alert.alert('Sucesso 🎉', 'Tarefa criada e atribuída com sucesso!', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    }
  }

  const onChangeDate = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setScheduledAt(selectedDate);
    }
  };

  if (fetchingData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>A carregar opções...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Botão de Voltar */}
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="#1e293b" />
      </TouchableOpacity>

      <Text style={styles.title}>Criar Nova Tarefa</Text>
      <Text style={styles.subtitle}>Atribui uma tarefa de limpeza a um roommate</Text>

      {/* 1. Seleção do Roommate */}
      <View style={styles.section}>
        <Text style={styles.label}>1. Seleciona o Roommate</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalList}>
          {customers.map(c => {
            const isSelected = selectedCustomerId === c.id;
            return (
              <TouchableOpacity
                key={c.id}
                style={[styles.chip, isSelected && styles.chipSelected]}
                onPress={() => setSelectedCustomerId(c.id)}
              >
                <Ionicons
                  name="person-outline"
                  size={18}
                  color={isSelected ? '#fff' : '#64748b'}
                />
                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                  {c.name} (Quarto {c.room})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 2. Seleção do Tipo de Limpeza */}
      <View style={styles.section}>
        <Text style={styles.label}>2. Tipo de Limpeza</Text>
        <View style={styles.wrapContainer}>
          {cleaningTypes.map(t => {
            const isSelected = selectedCleaningTypeId === t.id;
            return (
              <TouchableOpacity
                key={t.id}
                style={[styles.chip, isSelected && styles.chipSelected]}
                onPress={() => setSelectedCleaningTypeId(t.id)}
              >
                <Ionicons
                  name="sparkles-outline"
                  size={18}
                  color={isSelected ? '#fff' : '#64748b'}
                />
                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                  {t.type}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* 3. Seleção da Data e Hora */}
      <View style={styles.section}>
        <Text style={styles.label}>3. Data Agendada</Text>
        <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
          <Ionicons name="calendar-outline" size={20} color="#6366f1" />
          <Text style={styles.dateButtonText}>
            {scheduledAt.toLocaleDateString('pt-PT')} às{' '}
            {scheduledAt.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={scheduledAt}
            mode="datetime"
            display="default"
            onChange={onChangeDate}
          />
        )}
      </View>

      {/* Botão de Guardar */}
      <TouchableOpacity
        style={[styles.saveButton, loading && styles.buttonDisabled]}
        onPress={handleCreateTask}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="add-circle-outline" size={22} color="#fff" />
            <Text style={styles.saveButtonText}>Guardar Tarefa</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  contentContainer: { padding: 20 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  loadingText: { marginTop: 12, color: '#64748b', fontSize: 15 },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 26, fontWeight: 'bold', color: '#1e293b' },
  subtitle: { fontSize: 14, color: '#64748b', marginBottom: 24, marginTop: 4 },
  section: { marginBottom: 24 },
  label: { fontSize: 16, fontWeight: 'bold', color: '#334155', marginBottom: 12 },
  horizontalList: { flexDirection: 'row' },
  wrapContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  chipSelected: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  chipText: { marginLeft: 8, color: '#475569', fontSize: 14, fontWeight: '500' },
  chipTextSelected: { color: '#fff', fontWeight: 'bold' },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    padding: 14,
    borderRadius: 12,
  },
  dateButtonText: { marginLeft: 10, fontSize: 15, color: '#1e293b', fontWeight: '500' },
  saveButton: {
    backgroundColor: '#10b981',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 12,
    elevation: 3,
  },
  buttonDisabled: { backgroundColor: '#a7f3d0' },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
});