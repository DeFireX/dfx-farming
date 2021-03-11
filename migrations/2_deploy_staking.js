const fs = require("fs");
const path = require("path");

// smart contracts
const DfxStaking = artifacts.require("DfxStaking.sol");

// params
const dfxAddress = "0x74B3abB94e9e1ECc25Bd77d6872949B4a9B2aACF";

module.exports = async function (deployer, network) {
    if (network === "test") return; // skip migrations if use test network

    console.log("DfxStaking deployment");
    await deployer.deploy(DfxStaking,
        dfxAddress
    );
    let dfxStaking = await DfxStaking.deployed();
    console.log("DfxStaking address: ", dfxStaking.address);

    // write addresses to file
    console.log("write addresses to file");
    const contractsAddresses = {
        DfxStaking: dfxStaking.address
    };

    const deployDirectory = `${__dirname}/../deployed`;
    if (!fs.existsSync(deployDirectory)) {
        fs.mkdirSync(deployDirectory);
    }

    fs.writeFileSync(path.join(deployDirectory, `${network}_staking.json`), JSON.stringify(contractsAddresses, null, 2));
};
