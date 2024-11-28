import React, { useState, useEffect } from 'react';
import { Image, StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ParallaxScrollView from '@/components/ParallaxScrollView';

export default function HomeScreen() {
  const router = useRouter();
  const [markedDates, setMarkedDates] = useState({});

  // Carregar as datas marcadas do armazenamento local ao carregar o componente
  useEffect(() => {
    const loadMarkedDates = async () => {
      try {
        const storedDates = await AsyncStorage.getItem('markedDates');
        if (storedDates) {
          setMarkedDates(JSON.parse(storedDates));
        }
      } catch (error) {
        console.error('Erro ao carregar datas marcadas:', error);
      }
    };
    loadMarkedDates();
  }, []);

  // Atualizar as datas marcadas no armazenamento local sempre que `markedDates` mudar
  useEffect(() => {
    const saveMarkedDates = async () => {
      try {
        await AsyncStorage.setItem('markedDates', JSON.stringify(markedDates));
      } catch (error) {
        console.error('Erro ao salvar datas marcadas:', error);
      }
    };
    saveMarkedDates();
  }, [markedDates]);

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={{ uri: 'https://i.pinimg.com/736x/5b/67/46/5b6746c706883eb42bc22ce300f38298.jpg' }}
          style={styles.reactLogo}
        />
      }
    >
      <View style={styles.body}>
        {/* Bloco para Cadastrar Remédio */}
        <View style={styles.block}>
          <Text style={styles.textAboveImage}>Cadastrar Remédio</Text>
          <TouchableOpacity onPress={() => router.push('../Screens/CadastroRemedio')}>
            <View style={styles.imageContainer}>
              <Image
                source={{
                  uri: 'https://cdn.pixabay.com/photo/2023/10/01/14/40/medicine-8287535_1280.jpg',
                }}
                style={styles.image}
                resizeMode="cover"
              />
            </View>
          </TouchableOpacity>
        </View>

        {/* Bloco para Calendário */}
        <View style={styles.block}>
          <Text style={styles.textAboveImage}>Calendário</Text>
          <TouchableOpacity onPress={() => router.push('/Calendario')}>
            <View style={styles.calendarPreviewContainer}>
              <Calendar
                style={styles.calendarFullSize}
                markingType={'dot'}
                markedDates={markedDates}
                disableAllTouchEventsForDisabledDays={true}
                hideExtraDays={true}
                theme={{
                  backgroundColor: '#ffffff',
                  calendarBackground: '#ffffff',
                  selectedDayBackgroundColor: 'green',
                  todayTextColor: 'red',
                  arrowColor: 'blue',
                  dotColor: 'red',
                }}
              />
            </View>
          </TouchableOpacity>
        </View>

      </View>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  block: {
    alignItems: 'center',
    marginBottom: 20,
  },
  textAboveImage: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000',
    marginBottom: 10,
  },
  imageContainer: {
    width: 350,
    height: 220,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#e0e0e0',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  reactLogo: {
    width: '100%',
    height: '100%',
  },
  calendarPreview: {
    flex: 1,
    borderRadius: 10,
  },
  calendarPreviewContainer: {
    width: 350,
    height: 320, // Altura ajustada para o calendário
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: '#27485C',
    borderWidth: 4
  },
  calendarFullSize: {
    width: 350,
    height: 320,  // Garante que ele se expanda
    borderRadius: 10,
    borderColor: '#ccc'
  },
});
