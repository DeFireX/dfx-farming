const DfxFarmingPoolV2 = artifacts.require("DfxFarmingPoolV2");
const DefirexTreasury = artifacts.require("DefirexTreasury");
const ERC20Mock = artifacts.require("ERC20Mock");

async function mineBlock(n) {
    for(let i = 0; i < n;i++) {
        await (new Promise((resolve ,reject)=>{
            web3.currentProvider.send({ jsonrpc: "2.0", method: "evm_increaseTime", params: [3600], id: new Date().getTime()}, (err, ret)=> {
                err? reject(err) : resolve(ret);
            });
        }));
        await (new Promise((resolve ,reject)=>{
            web3.currentProvider.send({ jsonrpc: "2.0", method: "evm_mine", id: new Date().getTime()}, (err, ret)=> {
                err? reject(err) : resolve(ret);
            });
        }));
    }
}

// Traditional Truffle test
contract("DfxFarmingPoolV2", (accounts) => {
    const OWNER = accounts[0];
    const USER1 = accounts[1];
    console.log('OWNER', OWNER);
    console.log('USER1', USER1);

    it("Deploy contracts & test", async function () {
        // reward, deposit
        const rewardToken = await ERC20Mock.new("", "", OWNER, (100 * 1e18).toString(10));
        const depositToken = await ERC20Mock.new("", "", OWNER, (140 * 1e18).toString(10));
        const dfxFarmingPoolV2 = await DfxFarmingPoolV2.new(rewardToken.address, depositToken.address);
        const defirexTreasury = await DefirexTreasury.new();
        // 10% once per day
        await defirexTreasury.add(rewardToken.address, dfxFarmingPoolV2.address, 24 * 60 * 60, 10 * 1000, 0);
        await dfxFarmingPoolV2.setDfTreasury(defirexTreasury.address, {from: OWNER});
        await rewardToken.transfer(defirexTreasury.address, (100 * 1e18).toString(10));
        await depositToken.approve(dfxFarmingPoolV2.address, (900 * 1e18).toString(10), {from: OWNER});
        await dfxFarmingPoolV2.deposit((20 * 1e18).toString(10), {from: OWNER});
        const bal1 = await depositToken.balanceOf(OWNER);
        await mineBlock(100);
        await dfxFarmingPoolV2.deposit((0 * 1e18).toString(10), {from: OWNER});
        const bal2 = await depositToken.balanceOf(OWNER);
        console.log(bal2.toString(), bal1.toString());
    })

});
