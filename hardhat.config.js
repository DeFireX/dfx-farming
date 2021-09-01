require("@nomiclabs/hardhat-truffle5");
require("hardhat-gas-reporter");

// const config = require('dotenv').config();
// const DEPLOYER = config.parsed.DEPLOYER;
// console.log('DEPLOYER', DEPLOYER);
// const POLYGON_DEPLOYER_KEY = config.parsed.PK;
/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
    solidity: "0.6.12",
    gasReporter: {
        enabled: false
    },
    namedAccounts: {
        deployer: 0,
    },
    // networks: {
    //     hardhat: {
    //         forking: {
    //             url: "https://polygon-mainnet.infura.io/v3/b9d062c314ec42bd8019d3ed8a20d105"
    //         }
    //     },
    // }
    paths: {
        tests: "./hardhat-tests",
    },

    mocha: {
        timeout: 100000
    }
};
