import { ethers } from 'ethers';
import crypto from 'crypto';

// Configuration
// Default to public RPC if not set
const RPC_URL = process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com';

// Official USDT Polygon Contract
const USDT_ADDRESS = process.env.USDT_CONTRACT_ADDRESS || '0xc2132D05D31c914a87C6611C10748AEb04B58e8F';

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
 * Uses a hash of the userId to generate a unique index for HD Wallet derivation.
 * Path: m/44'/60'/0'/0/{index} (assuming XPUB is at account level m/44'/60'/0')
 * 
 * Note: If MASTER_XPUB is not set (dev mode), returns a random address.
 */
export const deriveUserAddress = (userId: string | number): string => {
  if (!MASTER_XPUB) {
    console.warn('WALLET_MASTER_XPUB not set, generating random address (unsafe for prod)');
    // Fallback: Generate a random wallet if XPUB is missing. 
    // WARNING: Users will get a different address every time if they reload!
    return ethers.Wallet.createRandom().address;
  }

  try {
    const userIdStr = userId.toString();
    // Generate a deterministic index from userId (0 to 2^31 - 1)
    // MD5 (128 bits) -> Take first 8 chars (32 bits) -> Parse Hex -> Modulo Max Int32
    const hash = crypto.createHash('md5').update(userIdStr).digest('hex');
    const index = parseInt(hash.substring(0, 8), 16) % 2147483647;

    // Derive address from XPUB
    // Assumes XPUB is for path m/44'/60'/0' (Account level)
    // We derive child 0/index (External chain, index)
    const hdNode = ethers.HDNodeWallet.fromExtendedKey(MASTER_XPUB);
    const childNode = hdNode.derivePath(`0/${index}`);
    
    return childNode.address;
  } catch (error) {
    console.error('Error deriving address:', error);
    throw new Error('Failed to derive wallet address');
  }
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
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const contract = getUsdtContract(wallet);

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
