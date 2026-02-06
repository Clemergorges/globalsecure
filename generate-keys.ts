
import { ethers } from 'ethers';

const wallet = ethers.Wallet.createRandom();
const mnemonic = wallet.mnemonic?.phrase;
const hdNode = ethers.HDNodeWallet.fromPhrase(mnemonic!);

console.log('--- COPIAR ABAIXO ---');
console.log(`MNEMONIC="${mnemonic}"`);
console.log(`XPUB="${hdNode.neuter().extendedKey}"`);
console.log(`PRIVATE_KEY="${wallet.privateKey}"`);
console.log('--- FIM ---');
