import React from 'react';
import { Tabs } from 'expo-router';
import Icon from 'react-native-vector-icons/MaterialIcons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: '#27485C', // Fundo azul do cabeçalho
        },
        headerTitleStyle: {
          fontSize: 20,
          fontWeight: 'bold',
          color: '#FFF', // Texto branco
        },
        headerTitleAlign: 'center', // Título centralizado
        tabBarStyle: {
          backgroundColor: '#27485C', // Fundo das abas
          height: 60,
        },
        headerShadowVisible: false, // Remove a sombra entre o cabeçalho e o conteúdo
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Icon name="home" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="Calendario"
        options={{
          title: 'Calendário',
          tabBarIcon: ({ color }) => <Icon name="calendar-today" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="Cadastro"
        options={{
          title: 'Cadastro',
          tabBarIcon: ({ color }) => <Icon name="person-add" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
