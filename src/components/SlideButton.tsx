import React, { useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SlideButtonProps {
  title?: string;
  onSwipeSuccess: () => void;
}

const BUTTON_WIDTH = Dimensions.get('window').width - 64; // Largura do container
const THUMB_SIZE = 52; // Tamanho do botão circular
const SWIPE_LIMIT = BUTTON_WIDTH - THUMB_SIZE - 8; // Distância total de deslize

export default function SlideButton({
  title = 'Deslize para Concluir',
  onSwipeSuccess,
}: SlideButtonProps) {
  const pan = useRef(new Animated.ValueXY()).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        // Limita o movimento entre 0 e a margem máxima da barra
        if (gestureState.dx >= 0 && gestureState.dx <= SWIPE_LIMIT) {
          pan.x.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        // Se deslisou mais de 75% do caminho, considera concluído
        if (gestureState.dx >= SWIPE_LIMIT * 0.75) {
          Animated.timing(pan.x, {
            toValue: SWIPE_LIMIT,
            duration: 150,
            useNativeDriver: false,
          }).start(() => {
            onSwipeSuccess();
            // Reseta a posição suavemente após a ação
            setTimeout(() => {
              Animated.spring(pan.x, {
                toValue: 0,
                useNativeDriver: false,
              }).start();
            }, 500);
          });
        } else {
          // Se soltou antes, regressa à posição inicial de forma fluida
          Animated.spring(pan.x, {
            toValue: 0,
            useNativeDriver: false,
            bounciness: 6,
          }).start();
        }
      },
    })
  ).current;

  // Opacidade do texto que desaparece à medida que deslizas
  const textOpacity = pan.x.interpolate({
    inputRange: [0, SWIPE_LIMIT / 2],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      {/* Texto centralizado com efeito fade */}
      <Animated.Text style={[styles.title, { opacity: textOpacity }]}>
        {title}
      </Animated.Text>

      {/* Botão arrastável (Thumb) */}
      <Animated.View
        style={[
          styles.thumb,
          {
            transform: [{ translateX: pan.x }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <Ionicons name="chevron-forward-outline" size={26} color="#1e293b" />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: BUTTON_WIDTH,
    height: 60,
    backgroundColor: '#1e293b',
    borderRadius: 30,
    justifyContent: 'center',
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    position: 'absolute',
    alignSelf: 'center',
    color: '#cbd5e1',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});