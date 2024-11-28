import React from 'react';
import { FlatList, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router'; // Importa o router do expo-router

export default function CadastroRemedio() {
  const data = [1, 2, 3, 4, 5, 6, 7];
  const router = useRouter(); 

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
            color: '#FFF', // Texto branco
          },
          headerTitleAlign: 'center',
          title: 'Cadastro de Remédio',
        }}
      />
      <View style={styles.container}>
        <FlatList
          data={data}
          keyExtractor={(item) => item.toString()}
          numColumns={2} // Configura a lista para exibir duas colunas
          contentContainerStyle={styles.flatListContainer}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => router.push(`/Screens/DescricaoRemedio?medicamentoId=${item}`)}
              style={styles.itemContainer}
            >
              <View style={styles.imagem2}>
                <Text style={styles.numberText}>{item}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  flatListContainer: {
    padding: 20,
    justifyContent: 'center',
  },
  itemContainer: {
    flex: 1,
    alignItems: 'center',
    margin: 10, // Espaçamento entre os itens
  },
  imagem2: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e3e3e3',
    borderRadius: 10,
  },
  numberText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#27485C',
  },
});
