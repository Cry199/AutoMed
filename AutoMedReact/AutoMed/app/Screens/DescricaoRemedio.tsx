import React, { useState } from 'react';
import { StyleSheet, Text, View, Button, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { Stack } from 'expo-router';

export default function DescricaoRemedio() {
  const [inputFields, setInputFields] = useState([{ id: 1, value: '' }]);

  const addInputField = () => {
    setInputFields([...inputFields, { id: inputFields.length + 1, value: '' }]);
  };

  const removeInputField = (id) => {
    setInputFields(inputFields.filter((field) => field.id !== id));
  };

  const handleInputChange = (id, value) => {
    const formattedValue = formatTime(value);
    const newInputFields = inputFields.map((field) => {
      if (field.id === id) {
        return { ...field, value: formattedValue };
      }
      return field;
    });
    setInputFields(newInputFields);
  };

  const formatTime = (value) => {
    let formattedValue = value.replace(/[^0-9]/g, ''); // Remove caracteres não numéricos
    if (formattedValue.length > 2) {
      formattedValue = formattedValue.slice(0, 2) + ':' + formattedValue.slice(2, 4);
    }
    return formattedValue;
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerStyle: {
            backgroundColor: '#27485C', // Fundo azul
          },
          headerTitleStyle: {
            fontSize: 20,
            fontWeight: 'bold',
            color: '#FFF', // Texto branco
          },
          headerTitleAlign: 'center', // Texto centralizado
          title: 'Cadastro de Remédio', // Título personalizado
        }}
      />
      <View style={styles.container}>
        <ScrollView style={styles.content}>
          <View style={styles.quadradoCinza}>
            <Text style={styles.quadradoText}>Nome do medicamento:</Text>
            <TextInput
              style={styles.input}
              placeholder="Digite o nome do medicamento"
              placeholderTextColor="#000"
            />
            <Text style={styles.quadradoText}>Quantidade da cartela:</Text>
            <TextInput
              style={styles.input}
              placeholder="Digite a quantidade"
              placeholderTextColor="#000"
              keyboardType="numeric"
            />
            <Text style={styles.quadradoText}>Dias da semana:</Text>
            <TextInput
              style={styles.input}
              placeholder="Digite o dia da semana"
              placeholderTextColor="#000"
            />
            <Text style={styles.quadradoText}>Horas:</Text>

            {inputFields.map((field) => (
              <View key={field.id} style={styles.hoursContainer}>
                <TextInput
                  style={styles.inputHours}
                  placeholder="Digite as horas"
                  placeholderTextColor="#000"
                  keyboardType="numeric"
                  value={field.value}
                  onChangeText={(value) => handleInputChange(field.id, value)}
                />
                {inputFields.length > 1 && (
                  <Button title="-" onPress={() => removeInputField(field.id)} />
                )}
              </View>
            ))}
            <Button title="+" onPress={addInputField} style={styles.addButton} />
          </View>
          <TouchableOpacity
            style={styles.botaoContainer}
            onPress={() => {
              alert('Confirmado!');
            }}
          >
            <Text style={styles.botaoTexto}>Confirmar</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    marginTop: 20,
    paddingHorizontal: 20,
    backgroundColor: '#27485C', // Fundo azul
  },
  quadradoCinza: {
    marginTop: '10%',
    width: '100%',
    backgroundColor: '#1D3D47', // Azul escuro
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
  },
  botaoContainer: {
    marginTop: '10%',
    marginBottom: '10%',
    width: '100%',
    borderWidth: 2,
    borderColor: '#cccccc',
    backgroundColor: '#FFF',
    borderRadius: 5,
    padding: 10,
    alignItems: 'center',
  },
  botaoTexto: {
    color: '#27485C',
    fontSize: 16,
    fontWeight: 'bold',
  },
  quadradoText: {
    color: '#FFF', // Texto branco
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    width: '100%',
    textAlign: 'left',
  },
  input: {
    width: '100%',
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    padding: 10,
    color: '#000',
    marginBottom: 20,
    backgroundColor: '#D9D9D9',
  },
  inputHours: {
    width: '85%',
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    padding: 10,
    color: '#000',
    backgroundColor: '#D9D9D9',
  },
  hoursContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    width: '100%',
  },
  addButton: {
    alignSelf: 'flex-start',
    marginTop: 10,
  },
});
