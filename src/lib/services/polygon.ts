import { ethers } from 'ethers';
import crypto from 'crypto';
import { prisma } from '@/lib/db';

// Configuration
// Default to public RPC if not set
const RPC_URL = process.env.POLYGON_RPC_URL || 'https://rpc-amoy.polygon.technology';

// Official USDT Polygon Contract
const USDT_ADDRESS = process.env.USDT_CONTRACT_ADDRESS || '0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582';

const PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY;
const MASTER_XPUB = process.env.WALLET_MASTER_XPUB;
const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY;

// Cache for USDT Decimals (Lazy load)
let cachedDecimals: number | null = null;

// Cache for USDT Price (Simple memory cache)
let cachedPrice: { value: number; timestamp: number } | null = null;
const PRICE_CACHE_TTL_MS = 60 * 1000; // 60 seconds

// ABIs
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "event Transfer(address indexed from, address indexed to, uint256 value)"
];

/**
 * Returns a configured JsonRpcProvider for Polygon.
 */
export const getProvider = (): ethers.JsonRpcProvider => {
  return new ethers.JsonRpcProvider(RPC_URL);
};

/**
 * Returns an instance of the USDT Contract (ERC20).
 */
export const getUsdtContract = (providerOrSigner?: ethers.Provider | ethers.Signer): ethers.Contract => {
  const provider = providerOrSigner || getProvider();
  return new ethers.Contract(USDT_ADDRESS, ERC20_ABI, provider);
};

/**
 * Helper to get decimals with caching
 */
const getDecimals = async (contract: ethers.Contract): Promise<number> => {
  if (cachedDecimals !== null) return cachedDecimals;
  try {
    cachedDecimals = Number(await contract.decimals());
    return cachedDecimals;
  } catch (error) {
    console.error('Failed to fetch decimals, defaulting to 6 (USDT standard)', error);
    return 6; 
  }
};

/**
 * Derives a deterministic deposit address for a user based on their ID.
 * Persists the address in the Wallet model for reverse lookup.
 */
export const deriveUserAddress = async (userId: string): Promise<string> => {
  // 1. Check if user already has an address stored
  const existingWallet = await prisma.account.findUnique({
    where: { userId },
    select: { cryptoAddress: true, cryptoAddressIndex: true }
  });

  if (existingWallet?.cryptoAddress) {
    return existingWallet.cryptoAddress;
  }

  // 2. Generate new address
  let address: string;
  let index: number | null = null;

  if (!MASTER_XPUB || MASTER_XPUB.includes('CHANGE_ME')) {
    console.warn('WALLET_MASTER_XPUB not set or invalid, generating random address (TESTNET/DEV)');
    const randomWallet = ethers.Wallet.createRandom();
    address = randomWallet.address;
    // index remains null for random wallets
  } else {
    try {
      // Generate a deterministic index from userId
      const hash = crypto.createHash('md5').update(userId).digest('hex');
      index = parseInt(hash.substring(0, 8), 16) % 2147483647;

      // Derive address from XPUB
      const hdNode = ethers.HDNodeWallet.fromExtendedKey(MASTER_XPUB);
      const childNode = hdNode.derivePath(`0/${index}`);
      address = childNode.address;
    } catch (error) {
      console.error('Error deriving address:', error);
      throw new Error('Failed to derive wallet address');
    }
  }

  // 3. Save to Database
  await prisma.account.update({
    where: { userId },
    data: {
      cryptoAddress: address,
      cryptoAddressIndex: index
    }
  });

  return address;
};

/**
 * Gets the USDT balance for a specific address.
 * Returns the balance as a string (human readable, normalized by decimals).
 */
export const getUserBalanceUsdt = async (userAddress: string): Promise<string> => {
  try {
    const contract = getUsdtContract();
    const balance = await contract.balanceOf(userAddress);
    const decimals = await getDecimals(contract);
    return ethers.formatUnits(balance, decimals);
  } catch (error) {
    console.error('Error fetching balance:', error);
    return '0.0';
  }
};

/**
 * Sends USDT from the system's hot wallet to a destination address.
 * Requires WALLET_PRIVATE_KEY to be set.
 */
export const sendUsdtFromHotWallet = async (to: string, amountUsdt: string): Promise<string> => {
  // Security check: Ensure private key is available
  if (!PRIVATE_KEY) {
    throw new Error('WALLET_PRIVATE_KEY not configured');
  }

  try {
    const provider = getProvider();
    const account = new ethers.Wallet(PRIVATE_KEY, provider);
    const contract = getUsdtContract(account);

    const decimals = await getDecimals(contract);
    const amountUnits = ethers.parseUnits(amountUsdt, decimals);

    // Optional: Estimate gas could be done here
    // const gasLimit = await contract.transfer.estimateGas(to, amountUnits);
    
    const tx = await contract.transfer(to, amountUnits);
    
    // Wait for at least 1 confirmation to ensure propagation
    await tx.wait(1);

    return tx.hash;
  } catch (error) {
    console.error('Error sending USDT:', error);
    throw error;
  }
};

/**
 * Fetches the current USDT price in USD from CoinGecko with Caching.
 * Handles missing API key by using public endpoint.
 */
export const getUsdtPriceUsd = async (): Promise<number> => {
  // Check Cache
  const now = Date.now();
  if (cachedPrice && (now - cachedPrice.timestamp < PRICE_CACHE_TTL_MS)) {
    return cachedPrice.value;
  }

  try {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=usd`;
    
    // Only attach header if key is present
    const headers: HeadersInit = COINGECKO_API_KEY ? { 'x-cg-demo-api-key': COINGECKO_API_KEY } : {};
    
    const response = await fetch(url, { headers });
    if (!response.ok) {
        // If 429 (Rate Limit) and we have no key, it's expected.
        console.warn(`CoinGecko API warning: ${response.status} ${response.statusText}`);
        throw new Error(`CoinGecko API error: ${response.statusText}`);
    }
    const data = await response.json();
    
    const price = data.tether?.usd || 1.0;
    
    // Update Cache
    cachedPrice = { value: price, timestamp: now };
    
    return price;
  } catch (error) {
    console.error('Error fetching price:', error);
    // Return cached value if available even if expired, otherwise fallback
    return cachedPrice ? cachedPrice.value : 1.0; 
  }
};
