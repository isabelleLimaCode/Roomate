import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../database/supabase';

export default function SignUpScreen() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [room, setRoom] = useState('');

  // Estados da Casa
  const [isCreatingHouse, setIsCreatingHouse] = useState(true);
  const [houseName, setHouseName] = useState('');
  const [joinCode, setJoinCode] = useState('');

  const [loading, setLoading] = useState(false);

  async function handleSignUp() {
    if (!email || !password || !name || !room) {
      Alert.alert('Atenção', 'Preenche todos os teus dados pessoais.');
      return;
    }

    if (isCreatingHouse && !houseName) {
      Alert.alert('Atenção', 'Indica o nome da casa.');
      return;
    }

    if (!isCreatingHouse && !joinCode) {
      Alert.alert('Atenção', 'Insere o código de convite da casa.');
      return;
    }

    setLoading(true);

    try {
      // 1. Regista o utilizador no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError || !authData.user) throw authError;

      let targetHouseId: string | null = null;

      if (isCreatingHouse) {
        // 2A. Criar nova casa
        const codigoGerado = 'CASA-' + Math.floor(1000 + Math.random() * 9000);
        const { data: houseData, error: houseError } = await supabase
          .from('house')
          .insert([{ name: houseName, join_code: codigoGerado }])
          .select()
          .single();

        if (houseError) throw houseError;
        targetHouseId = houseData.id;
      } else {
        // 2B. Procurar casa existente pelo código
        const { data: houseData, error: houseError } = await supabase
          .from('house')
          .select('id')
          .eq('join_code', joinCode.trim().toUpperCase())
          .single();

        if (houseError || !houseData) {
          Alert.alert('Erro', 'Código de casa não encontrado. Confirma se o código está correto.');
          setLoading(false);
          return;
        }
        targetHouseId = houseData.id;
      }

      // 3. Regista ou atualiza o perfil na tabela customer (utilizando upsert)
      const { error: customerError } = await supabase.from('customer').upsert(
        [
          {
            id: authData.user.id,
            name,
            room: Number(room),
            house_id: targetHouseId,
            cleanliness_status: 'limpo',
          },
        ],
        { onConflict: 'id' }
      );

      if (customerError) throw customerError;

      Alert.alert('Sucesso 🎉', 'Conta criada com sucesso!', [
        { text: 'OK', onPress: () => router.replace('/') },
      ]);
    } catch (error: any) {
      console.error('Erro no registo:', error);
      Alert.alert('Erro', error.message || 'Falha ao registar conta.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' , margintop: Platform.OS === 'android' ? 25 : 0}}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Botão Visível de Voltar ao Login */}
            <TouchableOpacity
              style={styles.backButtonContainer}
              onPress={() => router.replace('/login')}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={20} color="#6366f1" />
            </TouchableOpacity>

            <Text style={styles.title}>Registar Morador</Text>
            <Text style={styles.subtitle}>Cria a tua conta e junta-te à tua casa</Text>

            {/* Dados Pessoais */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nome Completo</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: João Silva"
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nº do Quarto</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: 3"
                keyboardType="numeric"
                value={room}
                onChangeText={setRoom}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>E-mail</Text>
              <TextInput
                style={styles.input}
                placeholder="exemplo@email.com"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Palavra-passe</Text>
              <TextInput
                style={styles.input}
                placeholder="******"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>

            {/* Alternador entre Criar ou Entrar em Casa */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tabButton, isCreatingHouse && styles.tabActive]}
                onPress={() => setIsCreatingHouse(true)}
              >
                <Text style={[styles.tabText, isCreatingHouse && styles.tabTextActive]}>
                  Criar Casa
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabButton, !isCreatingHouse && styles.tabActive]}
                onPress={() => setIsCreatingHouse(false)}
              >
                <Text style={[styles.tabText, !isCreatingHouse && styles.tabTextActive]}>
                  Entrar com Código
                </Text>
              </TouchableOpacity>
            </View>

            {isCreatingHouse ? (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nome da Casa / República</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Vivenda dos Estudantes"
                  value={houseName}
                  onChangeText={setHouseName}
                />
              </View>
            ) : (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Código de Convite da Casa</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: CASA-8492"
                  autoCapitalize="characters"
                  value={joinCode}
                  onChangeText={setJoinCode}
                />
              </View>
            )}

            <TouchableOpacity
              style={[styles.saveButton, loading && styles.buttonDisabled]}
              onPress={handleSignUp}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Concluir Registo</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20, paddingTop: 10, flexGrow: 1 },
  backButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20,
  },
  backButtonText: {
    color: '#6366f1',
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 6,
  },
  title: { fontSize: 26, fontWeight: 'bold', color: '#1e293b' },
  subtitle: { fontSize: 14, color: '#64748b', marginBottom: 20, marginTop: 4 },
  inputGroup: { marginBottom: 16 , marginTop: 10},
  label: { fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 6 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
    marginTop: 8,
  },
  tabButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: '#6366f1' },
  tabText: { fontWeight: '600', color: '#64748b', fontSize: 13 },
  tabTextActive: { color: '#fff' },
  saveButton: {
    backgroundColor: '#10b981',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 40,
  },
  buttonDisabled: { backgroundColor: '#a7f3d0' },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});