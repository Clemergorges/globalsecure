import React, { useState } from 'react';
import { View, Button, Alert, ActivityIndicator } from 'react-native';
import { useStripe, AddToWalletButton as StripeAddToWalletButton } from '@stripe/stripe-react-native';
import { fetchEphemeralKey } from '../services/api';

interface AddToWalletButtonProps {
  cardId: string;
  last4: string;
  brand: string;
}

export const AddToWalletButton: React.FC<AddToWalletButtonProps> = ({ cardId, last4, brand }) => {
  const { canAddCardToWallet } = useStripe();
  const [loading, setLoading] = useState(false);

  const handleAddToWallet = async () => {
    setLoading(true);
    try {
      // 1. Check if device supports adding card
      const { canAddCard, details, error } = await canAddCardToWallet({
        last4,
        cardBrand: brand, // e.g., 'Visa' or 'Mastercard'
        testEnv: true, // Use true for sandbox
      });

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      if (details?.status === 'ALREADY_EXISTS') {
        Alert.alert('Info', 'Card is already in the wallet.');
        return;
      }

      if (!canAddCard) {
        Alert.alert('Error', 'This device does not support adding this card.');
        return;
      }

      // 2. Fetch Ephemeral Key (Backend)
      const keyData = await fetchEphemeralKey(cardId);
      
      // keyData should contain the nonce, etc. required by the native UI
      // In a real app, you would pass these to a native module or handle the provisioning flow
      // However, @stripe/stripe-react-native mostly handles this if configured correctly with the backend
      
      // Since `AddToWalletButton` from Stripe handles the click internally, 
      // we usually provide the `token` (ephemeral key) via the `onComplete` or provisioning logic.
      
      Alert.alert('Success', 'Provisioning flow started (Mock).');

    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View>
        {/* Using the native Stripe button */}
        <StripeAddToWalletButton
            androidAssetId="google_pay_asset_id"
            iOSButtonStyle="onBlack"
            style={{ width: 200, height: 50 }}
            cardDetails={{
                last4: last4,
                brand: brand as any, // 'Visa' | 'Mastercard'
            }}
            ephemeralKey={async () => {
                const data = await fetchEphemeralKey(cardId);
                return data; // Needs to match expected object structure
            }}
            onComplete={({ error, status }) => {
                if (error) {
                    Alert.alert('Error', error.message);
                } else {
                    Alert.alert('Success', `Card status: ${status}`);
                }
            }}
        />
    </View>
  );
};
