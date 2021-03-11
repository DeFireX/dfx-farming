const fs = require("fs");
const path = require("path");

const {
    BN,
    ether
} = require("@openzeppelin/test-helpers");

// smart contracts
const DfxFarmingPool = artifacts.require("DfxFarmingPool.sol");
const Reservoir = artifacts.require("Reservoir.sol");
const IERC20 = artifacts.require("IERC20.sol");

// farming params
const dfxAddress = "0x74B3abB94e9e1ECc25Bd77d6872949B4a9B2aACF";
const devaddr = "0xdAE0aca4B9B38199408ffaB32562Bf7B3B0495fE";
const defiController = "0xdAE0aca4B9B38199408ffaB32562Bf7B3B0495fE";
const dfxPerBlock = ether("0.0001");
const startBlock = new BN("5600000");
const initialReservoirSupply = ether("5"); // in tokens

// LP pool
const lpAddress = "0x987f04DecE1c5AE9E69cF4F93D00bBE2cA5Af98c";
const lpAllocPoint = ether("0.6");

module.exports = async function (deployer, network) {
    if (network === "test") return; // skip migrations if use test network

    // get DFX from address
    let dfxToken = await IERC20.at(dfxAddress);

    console.log("DfxFarmingPool deployment");
    await deployer.deploy(DfxFarmingPool,
        dfxToken.address,
        devaddr,
        defiController,
        dfxPerBlock,
        startBlock
    );
    let farmingPool = await DfxFarmingPool.deployed();
    console.log("DfxFarmingPool address: ", farmingPool.address);

    console.log("Reservoir deployment");
    await deployer.deploy(Reservoir,
        dfxToken.address,
        farmingPool.address
    );
    let reservoir = await Reservoir.deployed();
    console.log("Reservoir address: ", reservoir.address);

    console.log("transfer DFXs to Reservoir");
    await dfxToken.transfer(
        reservoir.address,
        initialReservoirSupply
    );

    console.log("set Reservoir address in DfxFarmingPool");
    await farmingPool.setDfxReservoir(
        reservoir.address
    );

    console.log("add LP pool");
    await farmingPool.add(
        lpAllocPoint,
        lpAddress,
        false,
    );

    // write addresses to file
    console.log("write addresses to file");
    const contractsAddresses = {
        DfxFarmingPool: farmingPool.address,
        Reservoir: reservoir.address,
        DFX: dfxToken.address
    };

    const deployDirectory = `${__dirname}/../deployed`;
    if (!fs.existsSync(deployDirectory)) {
        fs.mkdirSync(deployDirectory);
    }

    fs.writeFileSync(path.join(deployDirectory, `${network}_farming.json`), JSON.stringify(contractsAddresses, null, 2));
};
