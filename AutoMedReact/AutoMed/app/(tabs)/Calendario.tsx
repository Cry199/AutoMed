import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Modal, TouchableOpacity, ScrollView , Image} from 'react-native';
import { Calendar } from 'react-native-calendars';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack } from 'expo-router';
import axios from 'axios';

export default function Calendario() {
  const [markedDates, setMarkedDates] = useState({});
  const [selectedDate, setSelectedDate] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [serverData, setServerData] = useState(null); // Para armazenar os dados recebidos
  const [serverModalVisible, setServerModalVisible] = useState(false); // Controla exibição do modal com dados

  const SERVER_URL = 'http://192.168.15.6:3000'; // HTTP
  // const SERVER_URL = 'https://192.168.15.8:3001'; // HTTPS 
  useEffect(() => {
    const loadMarkedDates = async () => {
      try {
        const storedDates = await AsyncStorage.getItem('markedDates');
        if (storedDates) {
          setMarkedDates(JSON.parse(storedDates));
        }
      } catch (error) {
        console.log('Erro ao carregar os dados:', error);
      }
    };

    loadMarkedDates();
  }, []);

  const clearCalendar = async () => {
    try {
      setMarkedDates({});
      await AsyncStorage.removeItem('markedDates');
      console.log('Calendário limpo com sucesso.');
    } catch (error) {
      console.log('Erro ao limpar o calendário:', error);
    }
  };

  useEffect(() => {
    const saveMarkedDates = async () => {
      try {
        await AsyncStorage.setItem('markedDates', JSON.stringify(markedDates));
      } catch (error) {
        console.log('Erro ao salvar os dados:', error);
      }
    };

    saveMarkedDates();
  }, [markedDates]);

  const handleDayPress = (day) => {
    setSelectedDate(day.dateString);
    setModalVisible(true);
  };

  const handleStatusChange = (status) => {
    setMarkedDates((prevDates) => {
      const updatedDates = {
        ...prevDates,
        [selectedDate]: {
          selected: true,
          marked: true,
          selectedColor:
            status === 'taken' ? 'green' :
              status === 'notTaken' ? 'red' :
                'yellow',
        },
      };
      return updatedDates;
    });
    setModalVisible(false);
  };

  const fetchServerData = async () => {
    try {
      const response = await axios.get(`${SERVER_URL}/daily-movements`);
      const data = response.data;

      // Verifica os dados recebidos e ajusta as cores no calendário
      const dateKey = data.data; // Exemplo: "2024-11-24"
      const movements = data.movements || [];
      const noMovementsMessage = data.message;

      if (movements.length >= 2) {
        const nearFaceCount = movements.filter(
          (movement) => movement.status === 'Mão próxima ao rosto detectada!'
        ).length;

        const awayFromFaceCount = movements.filter(
          (movement) => movement.status === 'Mão longe do rosto.'
        ).length;

        console.log('nearFaceCount:', nearFaceCount);
        console.log('awayFromFaceCount:', awayFromFaceCount);

        if (nearFaceCount >= 4) {
          // Verde se 2 ou mais "Mão próxima ao rosto."
          setMarkedDates((prevDates) => ({
            ...prevDates,
            [dateKey]: { selected: true, marked: true, selectedColor: 'green' },
          }));
        } else if (awayFromFaceCount >= 8) {
          // Vermelho se 2 ou mais "Mão longe do rosto."
          setMarkedDates((prevDates) => ({
            ...prevDates,
            [dateKey]: { selected: true, marked: true, selectedColor: 'red' },
          }));
        } else {
          // Amarelo se nenhum dos casos acima
          setMarkedDates((prevDates) => ({
            ...prevDates,
            [dateKey]: { selected: true, marked: true, selectedColor: 'yellow' },
          }));
        }
      } else if (noMovementsMessage) {
        // Amarelo se a mensagem "Nenhum frame processado encontrado para o dia atual."
        setMarkedDates((prevDates) => ({
          ...prevDates,
          [dateKey]: { selected: true, marked: true, selectedColor: 'yellow' },
        }));
      }

      setServerData(movements);
      setServerModalVisible(true);
    } catch (error) {
      console.log('Erro ao buscar dados do servidor:', error);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerStyle: {
            backgroundColor: '#27485C',
          },
          headerTitleStyle: {
            fontSize: 20,
            fontWeight: 'bold',
            color: '#FFF',
          },
          headerTitleAlign: 'center',
          title: 'Calendário de Medicamentos',
        }}
      />
      <View style={styles.container}>
        <Calendar
          style={styles.calendar}
          markedDates={markedDates}
          onDayPress={handleDayPress}
          theme={{
            selectedDayBackgroundColor: 'green',
            selectedDayTextColor: 'white',
            todayTextColor: 'red',
            dotColor: 'yellow',
            arrowColor: 'blue',
          }}
        />
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.colorBox, { backgroundColor: 'green' }]} />
            <Text>Medicamento tomado</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.colorBox, { backgroundColor: 'yellow' }]} />
            <Text>Sem validação</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.colorBox, { backgroundColor: 'red' }]} />
            <Text>Medicamento não tomado</Text>
          </View>
        </View>
          {/*          
        <TouchableOpacity style={styles.clearButton} onPress={clearCalendar}>
          <Text style={styles.clearButtonText}>Limpar Calendário</Text>
        </TouchableOpacity>
        */}
        {/* Botão para buscar dados do servidor */}
        <TouchableOpacity style={styles.fetchButton} onPress={fetchServerData}>
          <Text style={styles.fetchButtonText}>Receber Dados do MedLife</Text>
        </TouchableOpacity>

        {/* Modal para exibir dados do servidor */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={serverModalVisible}
          onRequestClose={() => setServerModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Dados Recebidos</Text>
              <ScrollView>
                {serverData && serverData.length > 0 ? (
                  serverData.map((movement, index) => (
                    <View key={index} style={styles.movementCard}>
                      <Text style={styles.frameText}>{movement.frame || 'Frame desconhecido'}</Text>
                      {movement.image ? (
                        <View style={styles.imageContainer}>
                          <Image
                            source={{ uri: movement.image }}
                            style={styles.movementImage}
                            resizeMode="contain"
                          />
                        </View>
                      ) : (
                        <Text style={styles.noImageText}>Imagem não disponível</Text>
                      )}
                      <Text style={styles.statusText}>{movement.status || 'Sem status disponível'}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.noDataText}>Nenhum dado disponível.</Text>
                )}
              </ScrollView>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#27485C' }]}
                onPress={() => setServerModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Fechar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>


        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Selecione o status para {selectedDate}</Text>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: 'green' }]}
                onPress={() => handleStatusChange('taken')}
              >
                <Text style={styles.modalButtonText}>Medicamento Tomado</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#ff7f7f' }]}
                onPress={() => handleStatusChange('notTaken')}
              >
                <Text style={styles.modalButtonText}>Medicamento Não Tomado</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: 'yellow' }]}
                onPress={() => handleStatusChange('unvalidated')}
              >
                <Text style={styles.modalButtonText}>Sem Validação</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalCloseButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  calendar: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 5,
  },
  legend: {
    marginTop: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
  },
  colorBox: {
    width: 20,
    height: 20,
    marginRight: 10,
  },
  fetchButton: {
    backgroundColor: '#27485C',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  fetchButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButton: {
    width: '100%',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  modalButtonText: {
    color: '#000',
    fontWeight: '600',
    fontSize: 16,
  },
  serverDataText: {
    fontSize: 14,
    marginBottom: 10,
    textAlign: 'center',
  },
  movementCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    alignItems: 'center',
  },
  frameText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  imageContainer: {
    width: '100%',
    height: 200,
    marginBottom: 10,
  },
  movementImage: {
    width: '100%',
    height: '100%',
    borderRadius: 5,
  },
  statusText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
  },
  noImageText: {
    fontSize: 14,
    color: '#888',
    marginBottom: 10,
  },
  noDataText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginTop: 20,
  }  
});
