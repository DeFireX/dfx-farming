const HDWalletProvider = require('@truffle/hdwallet-provider');
const web3 = require('web3');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({
  path: path.resolve(__dirname, '.env'),
});

function getProvider(rpc) {
  return function() {
    const provider = new web3.providers.WebsocketProvider(rpc);
    return new HDWalletProvider(process.env.DEPLOYMENT_KEY, provider);
  };
}

const config = {
  networks: {
    local: {
      host: '127.0.0.1',
      port: 8545,
      network_id: '*'
    },
    test: {
      // https://github.com/trufflesuite/ganache-core#usage
      provider() {
        const { provider } = require('@openzeppelin/test-environment');
        return provider;
      },
      skipDryRun: true,
      network_id: '*'
    },
    kovan: {
      gasPrice: 1e9, // 1 gwei
      gasLimit: 10 * 1e6,
      provider: getProvider(`wss://kovan.infura.io/ws/v3/${ process.env.INFURA_PROJECT_ID }`),
      websockets: true,
      skipDryRun: true,
      network_id: '42'
    },
    mainnet: {
      gasPrice: 75 * 1e9, // 75 gwei
      gasLimit: 7.5 * 1e6, // 7,500,000
      provider: getProvider(`wss://mainnet.infura.io/ws/v3/${ process.env.INFURA_PROJECT_ID }`),
      websockets: true,
      skipDryRun: false,
      network_id: '1'
    },
    bsc_testnet: {
      provider: () => new HDWalletProvider(process.env.DEPLOYMENT_KEY, `https://data-seed-prebsc-1-s1.binance.org:8545`),
      timeoutBlocks: 200,
      skipDryRun: true,
      network_id: '97'
    },
    bsc: {
      gasPrice: 10 * 1e9, // 10 gwei
      provider: () => new HDWalletProvider(process.env.DEPLOYMENT_KEY, `https://bsc-dataseed1.binance.org`),
      timeoutBlocks: 200,
      skipDryRun: false,
      network_id: '56'
    },
  },
  mocha: {
    timeout: 10000
  },
  compilers: {
    solc: {
      version: '0.6.12',
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        },
        evmVersion: "istanbul"
      }
    }
  },
  plugins: [
    'truffle-plugin-verify',
    'truffle-contract-size'
  ],
  api_keys: {
    etherscan: process.env.ETHERSCAN_API_KEY
  }
};

module.exports = config;
