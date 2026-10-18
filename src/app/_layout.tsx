import { useEffect, useState } from 'react';
import { Tabs, useRouter, useSegments } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, View } from 'react-native';
import { supabase } from '../database/supabase';

export default function TabLayout() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // 1. Verifica se existe sessão ativa
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // 2. Escuta mudanças no estado de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

    useEffect(() => {
      if (loading) return;

      // Verifica se o utilizador está numa rota pública (login ou signup)
      const isAuthPage = segments[0] === 'login' || segments[0] === 'signup';

      if (!session && !isAuthPage) {
        // Se não tem sessão e tenta aceder a uma página privada, vai para o login
        router.replace('/login');
      } else if (session && isAuthPage) {
        // Se já tem sessão e tenta aceder ao login/signup, vai para a página inicial
        router.replace('/');
      }
    }, [session, loading, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' }}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: '#94a3b8',
        headerStyle: { backgroundColor: '#f8fafc' },
        headerTitleStyle: { fontWeight: 'bold', color: '#1e293b' },
      }}
    >
      {/* Esconde a página de Login da barra inferior (Tabs) */}
      <Tabs.Screen
        name="login"
        options={{
          href: null, // Impede de aparecer na barra de abas
          headerShown: false, // Esconde o cabeçalho superior no login
          tabBarStyle: { display: 'none' }, // Esconde a barra inferior quando no login
        }}
      />

      <Tabs.Screen
        name="index"
        options={{
          title: 'Roomate',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="escala"
        options={{
          title: 'Escala',
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar" size={size} color={color} />,
        }}
      />

      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} />,
        }}
      />
       <Tabs.Screen
        name="signup"
        options={{
           href: null, // Impede de aparecer na barra de abas
          headerShown: false, // Esconde o cabeçalho superior no login
          tabBarStyle: { display: 'none' }, // Esconde a barra inferior quando no login
        }}
      />
    </Tabs>
  );
}