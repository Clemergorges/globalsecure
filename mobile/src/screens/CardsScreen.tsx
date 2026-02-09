import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Button, Alert } from 'react-native';
import { fetchCards, activateCard } from '../services/api';
import { AddToWalletButton } from '../components/AddToWalletButton';

interface Card {
  id: string;
  last4: string;
  brand: string;
  status: 'ACTIVE' | 'INACTIVE' | 'CANCELED';
  amount: number;
  currency: string;
}

export default function CardsScreen() {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCards = async () => {
    try {
      const data = await fetchCards();
      setCards(data);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCards();
  }, []);

  const handleActivate = async (cardId: string) => {
      try {
          await activateCard(cardId);
          Alert.alert('Success', 'Card activated');
          loadCards(); // Refresh
      } catch (e: any) {
          Alert.alert('Error', e.message);
      }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  const renderCard = ({ item }: { item: Card }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardBrand}>{item.brand.toUpperCase()}</Text>
        <Text style={styles.cardStatus}>{item.status}</Text>
      </View>
      <Text style={styles.cardNumber}>•••• •••• •••• {item.last4}</Text>
      <View style={styles.cardFooter}>
        <Text style={styles.cardLimit}>Limit: {item.currency} {item.amount}</Text>
      </View>
      
      <View style={styles.actions}>
          {item.status === 'INACTIVE' && (
              <Button title="Activate Card" onPress={() => handleActivate(item.id)} />
          )}
          
          {item.status === 'ACTIVE' && (
              <AddToWalletButton 
                cardId={item.id}
                last4={item.last4}
                brand={item.brand}
              />
          )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Cards</Text>
      <FlatList
        data={cards}
        renderItem={renderCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  list: {
    paddingBottom: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  cardBrand: {
    fontSize: 18,
    fontWeight: 'bold',
    fontStyle: 'italic',
    color: '#1a1a1a',
  },
  cardStatus: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    backgroundColor: '#eee',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    overflow: 'hidden',
  },
  cardNumber: {
    fontSize: 22,
    letterSpacing: 2,
    marginBottom: 20,
    fontFamily: 'monospace',
    color: '#333',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  cardLimit: {
    fontSize: 14,
    color: '#666',
  },
  actions: {
      gap: 10
  }
});
