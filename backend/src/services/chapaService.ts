/**
 * Chapa Payment Service
 * Integrates with Chapa Payment Gateway for Ethiopian Birr (ETB) payments
 * Documentation: https://developer.chapa.co/
 */

import axios from 'axios';

const CHAPA_BASE_URL = 'https://api.chapa.co/v1';
const CHAPA_SECRET_KEY = process.env.CHAPA_SECRET_KEY || '';

// Chapa API types
export interface ChapaTransaction {
  tx_ref: string;
  amount: string;
  currency: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  callback_url: string;
  return_url: string;
  customization?: {
    title: string;
    description: string;
  };
  meta?: Record<string, any>;
}

export interface ChapaTransactionResponse {
  status: string;
  message: string;
  data: {
    checkout_url: string;
    tx_ref: string;
  };
}

export interface ChapaVerificationResponse {
  status: string;
  message: string;
  data: {
    status: string;
    payment_status: string;
    amount: string;
    currency: string;
    tx_ref: string;
    email: string;
    first_name: string;
    last_name: string;
    phone_number?: string;
    created_at: string;
    completed_at?: string;
  };
}

export interface ChapaBank {
  bank_code: string;
  bank_name: string;
}

export interface ChapaBanksResponse {
  status: string;
  message: string;
  data: ChapaBank[];
}

/**
 * Initialize a transaction with Chapa
 */
export async function initializeTransaction(transaction: ChapaTransaction): Promise<ChapaTransactionResponse> {
  try {
    console.log('=== CHAPA REQUEST ===');
    console.log('URL:', `${CHAPA_BASE_URL}/transaction/initialize`);
    console.log('Payload:', JSON.stringify(transaction, null, 2));
    console.log('API Key:', CHAPA_SECRET_KEY.substring(0, 15) + '...');
    
    const response = await axios.post<ChapaTransactionResponse>(
      `${CHAPA_BASE_URL}/transaction/initialize`,
      transaction,
      {
        headers: {
          'Authorization': `Bearer ${CHAPA_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    console.log('=== CHAPA RESPONSE ===');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error: any) {
    console.error('=== CHAPA ERROR ===');
    console.error('Status:', error.response?.status);
    console.error('Data:', JSON.stringify(error.response?.data, null, 2));
    console.error('Message:', error.message);
    console.error('Full error:', JSON.stringify(error, null, 2));
    
    // Extract the actual error message
    const chapaError = error.response?.data;
    let errorMessage = 'Failed to initialize payment';
    
    if (chapaError) {
      if (typeof chapaError === 'string') {
        errorMessage = chapaError;
      } else if (chapaError.message) {
        errorMessage = typeof chapaError.message === 'string' 
          ? chapaError.message 
          : JSON.stringify(chapaError.message);
      } else if (chapaError.errors) {
        errorMessage = JSON.stringify(chapaError.errors);
      } else {
        errorMessage = JSON.stringify(chapaError);
      }
    }
    
    throw new Error(errorMessage);
  }
}

/**
 * Verify a transaction with Chapa
 */
export async function verifyTransaction(txRef: string): Promise<ChapaVerificationResponse> {
  try {
    const response = await axios.get<ChapaVerificationResponse>(
      `${CHAPA_BASE_URL}/transaction/verify/${txRef}`,
      {
        headers: {
          'Authorization': `Bearer ${CHAPA_SECRET_KEY}`,
        },
      }
    );
    return response.data;
  } catch (error: any) {
    console.error('Chapa verification error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Failed to verify payment');
  }
}

/**
 * Get list of supported banks
 */
export async function getBanks(): Promise<ChapaBanksResponse> {
  try {
    const response = await axios.get<ChapaBanksResponse>(
      `${CHAPA_BASE_URL}/banks`,
      {
        headers: {
          'Authorization': `Bearer ${CHAPA_SECRET_KEY}`,
        },
      }
    );
    return response.data;
  } catch (error: any) {
    console.error('Chapa get banks error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Failed to get banks');
  }
}

/**
 * Generate a unique transaction reference
 */
export function generateTxRef(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `TXN-${timestamp}-${random}`;
}

/**
 * Validate Chapa webhook signature
 */
export function verifyWebhookSignature(payload: any, signature: string): boolean {
  // Chapa sends webhook signature in the header
  // You should verify this matches your expected signature
  // For now, we'll do a basic check
  return !!signature && signature.length > 0;
}
