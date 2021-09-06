const DfxFarmingPoolV2 = artifacts.require("DfxFarmingPoolV2");
const DefirexTreasury = artifacts.require("DefirexTreasury");
const ERC20Mock = artifacts.require("ERC20Mock");
const {reportBalance, shouldFail, mineBlock} = require("./utils/utils");

// Traditional Truffle test
contract("DfxFarmingPoolV2", (accounts) => {
    const OWNER = accounts[0];
    const USER1 = accounts[1];
    const USER2 = accounts[2];
    console.log('OWNER', OWNER);
    console.log('USER1', USER1);
    console.log('USER2', USER2);

    it("Deploy contracts & test", async function () {
        // reward, deposit
        const rewardToken = await ERC20Mock.new("", "", OWNER, (900 * 1e18).toString(10));
        const depositToken = await ERC20Mock.new("", "", OWNER, (140 * 1e18).toString(10));
        await depositToken.transfer(USER1, (30 * 1e18).toString(10), {from: OWNER});
        await depositToken.transfer(USER2, (50 * 1e18).toString(10), {from: OWNER});

        const dfxFarmingPoolV2 = await DfxFarmingPoolV2.new(rewardToken.address, depositToken.address);
        const defirexTreasury = await DefirexTreasury.new();
        // 10% once per day
        await defirexTreasury.add(rewardToken.address, dfxFarmingPoolV2.address, 24 * 60 * 60, 10 * 1000, 0);
        await dfxFarmingPoolV2.setDfTreasury(defirexTreasury.address, {from: OWNER});

        await depositToken.approve(dfxFarmingPoolV2.address, (900 * 1e18).toString(10), {from: OWNER});
        await depositToken.approve(dfxFarmingPoolV2.address, (900 * 1e18).toString(10), {from: USER1});
        await depositToken.approve(dfxFarmingPoolV2.address, (900 * 1e18).toString(10), {from: USER2});
        // DEPOSIT
        await dfxFarmingPoolV2.deposit((20 * 1e18).toString(10), {from: OWNER});
        await dfxFarmingPoolV2.deposit((30 * 1e18).toString(10), {from: USER1});
        await dfxFarmingPoolV2.deposit((50 * 1e18).toString(10), {from: USER2});
        // Dist rewards
        await rewardToken.transfer(defirexTreasury.address, (100 * 1e18).toString(10));

        await reportBalance(rewardToken, USER2, async () =>{
            let balTreasury = await rewardToken.balanceOf(defirexTreasury.address);
            assert.equal(balTreasury, (100 * 1e18).toString(10), "wrong balance");
            await mineBlock(100);
            await dfxFarmingPoolV2.deposit((0 * 1e18).toString(10), {from: OWNER});
            await dfxFarmingPoolV2.deposit((0 * 1e18).toString(10), {from: USER1});
            await dfxFarmingPoolV2.deposit((0 * 1e18).toString(10), {from: USER2});
            await mineBlock(100);
        }, 5, true);

        let isAllowGathering = await defirexTreasury.isAllowedGathering(dfxFarmingPoolV2.address);
        console.log('isAllowGathering', isAllowGathering);
        const bal = await rewardToken.balanceOf(defirexTreasury.address);

        await reportBalance(rewardToken, USER1, async () =>{
            await dfxFarmingPoolV2.deposit((0 * 1e18).toString(10), {from: USER1});
        }, 0.3 * 9, true);

        await reportBalance(rewardToken, OWNER, async () =>{
            await dfxFarmingPoolV2.deposit((0 * 1e18).toString(10), {from: OWNER});
        }, 0.2 * 9, true);

        await reportBalance(rewardToken, USER2, async () =>{
            await dfxFarmingPoolV2.deposit((0 * 1e18).toString(10), {from: USER2});
        }, 0.5 * 9, true);

        // withdraw 30 tokens from balance USER2
        await dfxFarmingPoolV2.withdraw((30 * 1e18).toString(10), {from: USER2});
        {
            const bal = await depositToken.balanceOf(USER2);
            console.log('bal', bal.toString(10));
            assert.ok(bal.toString(10) === (30 * 1e18).toString(10), "wrong balance deposit token for USER2");
        }

        // total 200 reward tokens
        await rewardToken.transfer(defirexTreasury.address, (119 * 1e18).toString(10));
        await mineBlock(100);
        {
            const bal = await rewardToken.balanceOf(defirexTreasury.address);
            console.log('defirexTreasury bal', bal / 1e18);
        }

        await reportBalance(rewardToken, USER2, async () =>{
            await dfxFarmingPoolV2.deposit((0 * 1e18).toString(10), {from: USER2});
        }, 20/70 * 20, true);

        await reportBalance(rewardToken, OWNER, async () =>{
            await dfxFarmingPoolV2.deposit((0 * 1e18).toString(10), {from: OWNER});
        }, 20/70 * 20, true);

        await reportBalance(rewardToken, USER1, async () =>{
            await dfxFarmingPoolV2.deposit((0 * 1e18).toString(10), {from: USER1});
        }, 30/70 * 20, true);


        // withdraw all tokens from balance USER2
        await dfxFarmingPoolV2.withdraw((20 * 1e18).toString(10), {from: USER2});
        {
            const bal = await depositToken.balanceOf(USER2);
            console.log('bal', bal.toString(10));
            assert.ok(bal.toString(10) === (50 * 1e18).toString(10), "wrong balance deposit token for USER2");
        }

        await mineBlock(100);
        {
            const bal = await rewardToken.balanceOf(defirexTreasury.address);
            console.log('defirexTreasury bal', bal / 1e18);
        }

        await reportBalance(rewardToken, OWNER, async () =>{
            await dfxFarmingPoolV2.deposit((0 * 1e18).toString(10), {from: OWNER});
        }, 20/50 * 18, true);

        await reportBalance(rewardToken, USER1, async () =>{
            await dfxFarmingPoolV2.deposit((0 * 1e18).toString(10), {from: USER1});
        }, 30/50 * 18, true);

        // let isAllowGathering = await defirexTreasury.isAllowedGathering(dfxFarmingPoolV2.address);
        // console.log('isAllowGathering', isAllowGathering);
        // const rewards = await rewardToken.balanceOf(dfxFarmingPoolV2.address);
        // console.log('rewards', rewards.toString(10));
        // const pendingReward = await dfxFarmingPoolV2.pendingReward(OWNER);
        // console.log('pendingReward', pendingReward.toString(10));

        // const bal2 = await rewardToken.balanceOf(OWNER);
        // console.log(bal2.toString(), bal1.toString());

        // balTreasury = await rewardToken.balanceOf(defirexTreasury.address);
        // console.log("balTreasury", balTreasury.toString(10) / 1e18);
        // isAllowGathering = await defirexTreasury.isAllowedGathering(dfxFarmingPoolV2.address);
        // console.log('isAllowGathering', isAllowGathering);
    })

});
