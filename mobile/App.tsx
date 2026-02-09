import React from 'react';
import { StripeProvider } from '@stripe/stripe-react-native';
import CardsScreen from './src/screens/CardsScreen';

export default function App() {
  return (
    <StripeProvider
      publishableKey="pk_test_51SKzuZF3vBI9xx0tx003v77xoun7LmbTPCuaYxczLiBEni8pYCYo61eK1vktYAukwO6gvP2xOVs4E6U4UEiGGi5v00PcM2t8Mt"
      merchantIdentifier="merchant.com.globalsecuresend" // Required for Apple Pay
    >
      <CardsScreen />
    </StripeProvider>
  );
}
