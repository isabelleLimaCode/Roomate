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

  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(null);
  const [cleaningTypes, setCleaningTypes] = useState<CleaningType[]>([]);

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
      // 1. Obtém o utilizador logado
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        Alert.alert('Erro', 'Sessão inválida. Por favor, inicia sessão novamente.');
        router.back();
        return;
      }

      // 2. Procura os dados do roommate logado
      const { data: customerData, error: customerError } = await supabase
        .from('customer')
        .select('id, name, room')
        .eq('id', user.id)
        .single();

      if (customerError) throw customerError;

      // 3. Procura os tipos de limpeza
      const { data: typeData, error: typeError } = await supabase
        .from('cleaning_type')
        .select('id, type');

      if (typeError) throw typeError;

      setCurrentCustomer(customerData);
      setCleaningTypes(typeData || []);
    } catch (error: any) {
      console.error('Erro ao carregar dados:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados para criar a tarefa.');
    } finally {
      setFetchingData(false);
    }
  }

  async function handleCreateTask() {
    if (!currentCustomer) {
      Alert.alert('Erro', 'Utilizador não identificado.');
      return;
    }

    if (!selectedCleaningTypeId) {
      Alert.alert('Atenção', 'Por favor, seleciona o tipo de limpeza.');
      return;
    }

    setLoading(true);

    try {
      // 1. Define o início (00:00:00) e o fim (23:59:59) do dia selecionado
      const inicioDoDia = new Date(scheduledAt);
      inicioDoDia.setHours(0, 0, 0, 0);

      const fimDoDia = new Date(scheduledAt);
      fimDoDia.setHours(23, 59, 59, 999);

      // 2. Consulta o Supabase se já existe a MESMA limpeza agendada nesse dia
      const { data: tarefasExistentes, error: checkError } = await supabase
        .from('task')
        .select('id')
        .eq('cleaning_type_id', selectedCleaningTypeId)
        .gte('scheduled_at', inicioDoDia.toISOString())
        .lte('scheduled_at', fimDoDia.toISOString());

      if (checkError) throw checkError;

      // Se encontrar qualquer registo no mesmo dia, bloqueia a criação
      if (tarefasExistentes && tarefasExistentes.length > 0) {
        Alert.alert(
          'Data Ocupada ⚠️',
          'Já existe uma limpeza deste tipo agendada para este dia. Escolhe outra data ou outro tipo de limpeza.'
        );
        setLoading(false);
        return;
      }

      // 3. Insere a nova tarefa caso a data esteja livre
      const { error: insertError } = await supabase.from('task').insert([
        {
          scheduled_at: scheduledAt.toISOString(),
          status: 'nao terminou',
          customer_id: currentCustomer.id,
          cleaning_type_id: selectedCleaningTypeId,
        },
      ]);

      if (insertError) throw insertError;

      Alert.alert('Sucesso 🎉', 'A tua tarefa foi criada e agendada!', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      console.error('Erro ao guardar tarefa:', error);
      Alert.alert('Erro', `Falha ao guardar: ${error.message}`);
    } finally {
      setLoading(false);
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
      <Text style={styles.title}>Criar Nova Tarefa</Text>
      <Text style={styles.subtitle}>Agenda o teu próximo turno de limpeza</Text>

      {/* 1. Responsável (Utilizador Logado) */}
      <View style={styles.section}>
        <Text style={styles.label}>1. Responsável</Text>
        <View style={[styles.chip, styles.chipSelected]}>
          <Ionicons name="person" size={18} color="#fff" />
          <Text style={[styles.chipText, styles.chipTextSelected]}>
            {currentCustomer?.name} (Quarto {currentCustomer?.room})
          </Text>
        </View>
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
            minimumDate={new Date()}
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
            <Text style={styles.saveButtonText}>Guardar Minha Tarefa</Text>
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
  title: { fontSize: 26, fontWeight: 'bold', color: '#1e293b' },
  subtitle: { fontSize: 14, color: '#64748b', marginBottom: 24, marginTop: 4 },
  section: { marginBottom: 24 },
  label: { fontSize: 16, fontWeight: 'bold', color: '#334155', marginBottom: 12 },
  wrapContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
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