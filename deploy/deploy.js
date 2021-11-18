const gasPrice = 5 * 1e9;
const cacheFileName = './outJSON.json';
const fs = require('fs');

async function internalDeploy(deploy, name, options) {
    let data = {};
    if (fs.existsSync(cacheFileName)) {
        data = JSON.parse(fs.readFileSync(cacheFileName, 'utf8'));
    }
    const found = data[name.toLowerCase()];
    if (found) {
        console.log('Skip', name);
        return {address: found.address, abi : found.abi};
    }

    const info = await deploy(name, options);
    data[name.toLowerCase()] = {address: info.address, abi: info.abi};
    fs.writeFileSync(cacheFileName, JSON.stringify(data), 'utf8');
    console.log('Deployed', name);
    return {address: info.address, abi: info.abi};
}

module.exports = async ({
                            getNamedAccounts,
                            deployments,
                            getChainId,
                            getUnnamedAccounts,
                        }) => {

    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();
    console.log('deployer', deployer);

    const DFX = '0x74b3abb94e9e1ecc25bd77d6872949b4a9b2aacf';
    // const HGD = TODO: create HGD token ???
    const HAxe = await internalDeploy(deploy,'HAxe', {from: deployer, gasPrice: gasPrice, args: [] });
    const hgdTreasury = await internalDeploy(deploy,'HgdTreasury', {from: deployer, gasPrice: gasPrice, args: [] });
    const hFarmingPoolV2 = await internalDeploy(deploy,'HFarmingPoolV2', {from: deployer, gasPrice: gasPrice, args: [DFX, HAxe.address] });

    await deployments.sendTxAndWait({from: deployer, gasPrice:gasPrice}, 'HFarmingPoolV2', 'setDfTreasury', hgdTreasury.address);

    const interval = 3 * 60 * 60; // 3 hour
    const percent = 20 * 1000; // 20%
    await deployments.sendTxAndWait({from: deployer, gasPrice:gasPrice}, 'HgdTreasury', 'add',
        DFX, hFarmingPoolV2.address, interval, percent, 0);
};
