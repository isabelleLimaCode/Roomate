import { useEffect, useState, useCallback } from 'react';
import { Tabs, useRouter, useSegments } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, View } from 'react-native';
import { supabase } from '../database/supabase';

export default function TabLayout() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [unreadCount, setUnreadCount] = useState<number | undefined>(undefined);
  const segments = useSegments();
  const router = useRouter();

  const carregarContadorNotificacoes = useCallback(async () => {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setUnreadCount(undefined);
        return;
      }

      // Conta especificamente pelo ID para respeitar a política de RLS
      const { count, error } = await supabase
        .from('shift_exchange')
        .select('id', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .eq('status', 'pendente');

      if (error) {
        console.error('Erro ao contar notificações:', error.message);
        return;
      }

      // Atribui o número apenas se for superior a 0
      setUnreadCount(count && count > 0 ? count : undefined);
    } catch (error) {
      console.error('Erro na função de contagem:', error);
    }
  }, []);

  useEffect(() => {
    // 1. Obtém a sessão inicial e carrega a contagem
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      if (session) carregarContadorNotificacoes();
    });

    // 2. Escuta mudanças na autenticação
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        carregarContadorNotificacoes();
      } else {
        setUnreadCount(undefined);
      }
    });

    // 3. Atualiza periodicamente a cada 5 segundos para apanhar novas notificações
    const interval = setInterval(() => {
      carregarContadorNotificacoes();
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, [carregarContadorNotificacoes]);

  // Redirecionamentos de rotas autenticadas
  useEffect(() => {
    if (loading) return;

    const isAuthPage = segments[0] === 'login' || segments[0] === 'signup';

    if (!session && !isAuthPage) {
      router.replace('/login');
    } else if (session && isAuthPage) {
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
      <Tabs.Screen
        name="login"
        options={{
          href: null,
          headerShown: false,
          tabBarStyle: { display: 'none' },
        }}
      />

      <Tabs.Screen
        name="index"
        options={{
          title: 'Roommate',
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
          href: null,
          headerShown: false,
          tabBarStyle: { display: 'none' },
        }}
      />

      <Tabs.Screen
        name="crate_task"
        options={{
          title: 'Criar Tarefa',
          tabBarIcon: ({ color, size }) => <Ionicons name="add-circle" size={size} color={color} />,
        }}
      />

      <Tabs.Screen
        name="notifications"
        listeners={{
          tabPress: () => {
            carregarContadorNotificacoes();
          },
        }}
        options={{
          title: 'Notificações',
          tabBarBadge: unreadCount,
          tabBarBadgeStyle: {
            backgroundColor: '#ef4444',
            color: '#ffffff',
            fontSize: 11,
            fontWeight: 'bold',
          },
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="alert" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}