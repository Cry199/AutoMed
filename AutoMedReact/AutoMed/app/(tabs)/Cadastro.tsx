import React from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Keyboard } from 'react-native';

export default function Cadastro() {
  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.quadradoCinza}>
            <Text style={styles.quadradoText}>Nome completo:</Text>
            <TextInput style={styles.input} placeholder="Digite seu nome" placeholderTextColor="#000" />
            <Text style={styles.quadradoText}>Idade:</Text>
            <TextInput style={styles.input} placeholder="Digite sua idade" placeholderTextColor="#000" keyboardType="numeric" />
            <Text style={styles.quadradoText}>Peso:</Text>
            <TextInput style={styles.input} placeholder="Digite seu peso" placeholderTextColor="#000" keyboardType="numeric" />
            <Text style={styles.quadradoText}>Altura:</Text>
            <TextInput style={styles.input} placeholder="Digite sua Altura" placeholderTextColor="#000" keyboardType="numeric" />
            <Text style={styles.quadradoText}>Comorbidades:</Text>
            <TextInput style={styles.input2} placeholder="Digite suas comorbidades" placeholderTextColor="#000" />
          </View>

          {/* Botão de Confirmação */}
          <TouchableOpacity
            style={styles.botaoContainer}
            onPress={() => {
              alert('Confirmado!');
              Keyboard.dismiss(); 
            }}
          >
            <Text style={styles.botaoTexto}>Confirmar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contentContainer: {
    flexGrow: 1,
    padding: 0, // Remove padding extra
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    width: '100%', // Faz o formulário ocupar toda a largura
    alignItems: 'center',
    paddingHorizontal: 20, // Ajusta o espaçamento interno
    paddingTop: 20,
  },
  quadradoCinza: {
    width: '100%',
    backgroundColor: '#f4f4f9',
    borderRadius: 10,
    alignItems: 'center',
    padding: 20,
    marginBottom: 20,
  },
  botaoContainer: {
    width: '100%',
    borderWidth: 2,
    borderColor: '#cccccc',
    backgroundColor: '#27485C',
    borderRadius: 5,
    padding: 10,
    alignItems: 'center',
  },
  botaoTexto: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  quadradoText: {
    color: '#000',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
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
  input2: {
    width: '100%',
    height: 100,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    textAlignVertical: 'top',
    padding: 10,
    color: '#000',
    marginBottom: 20,
    backgroundColor: '#D9D9D9',
  },
});
