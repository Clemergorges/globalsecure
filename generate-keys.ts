
import { ethers } from 'ethers';

const account = ethers.Wallet.createRandom();
const mnemonic = account.mnemonic?.phrase;
const hdNode = ethers.HDNodeWallet.fromPhrase(mnemonic!);

console.log('--- COPIAR ABAIXO ---');
console.log(`MNEMONIC="${mnemonic}"`);
console.log(`XPUB="${hdNode.neuter().extendedKey}"`);
console.log(`PRIVATE_KEY="${account.privateKey}"`);
console.log('--- FIM ---');
