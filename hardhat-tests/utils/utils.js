const BigNumber = require("bignumber.js");

async function shouldFail(f) {
    try {
        await f();
    }catch (e) {
        return;
    }
    console.error('Function should fail but success');
    throw new Error('Function should fail but success');
}

async function reportBalance(token, user, f, balChangesTarget, display) {
    const bal1 = (token.methods && token.methods.balanceOf) ? await token.methods.balanceOf(user).call() : await token.balanceOf(user);

    await f();

    const bal2 = (token.methods && token.methods.balanceOf) ? await token.methods.balanceOf(user).call() : await token.balanceOf(user);
    const balChangesFact = (new BigNumber(bal2).minus(bal1)).dividedBy(1e18);
    if (balChangesTarget) {
        if (balChangesFact.minus(balChangesTarget).abs() > 0.0000001) {
            const msg = `reportBalance failed waiting for ${balChangesTarget} got ${balChangesFact.toNumber()}`;
            console.error(msg);
            throw new Error(msg);
        }
    }
    if (display) {
        console.log(`${user} balance changes ${(bal2 - bal1) / 1e18}`);
    }
}

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

module.exports = {reportBalance, shouldFail, mineBlock};
