const { accounts, contract } = require('@openzeppelin/test-environment');

const {
    BN,
    ether,
    time,
    expectRevert,
} = require('@openzeppelin/test-helpers');
const { duration } = require('@openzeppelin/test-helpers/src/time');

require('chai').should();

const Reservoir = contract.fromArtifact('Reservoir');
const DfxToken = contract.fromArtifact('DfxToken');
const ERC20Mock = contract.fromArtifact('ERC20Mock');
const FarmingPool = contract.fromArtifact('DfxFarmingPool');

describe('Contract farming/DfxFarmingPool.sol', function () {
    const [
        anyone,
        owner,
        user,
        devaddr,
        defiController,
        testAddress
    ] = accounts;

    const TOKEN_NAME = 'TEST';
    const TOKEN_SYMBOL = 'TEST';
    const INITIAL_SUPPLY = ether('1000');

    const REWARD_TOKENS_SUPPLY = ether('5');
    const REWARD_TOKENS_PER_BLOCK = ether('1');

    const ALLOC_POINT_LP_1 = ether('0.6');
    const ALLOC_POINT_LP_2 = ether('0.4');

    beforeEach(async function () {
        this.tokenRewards = await DfxToken.new(
            owner,
        );

        this.tokenLp1 = await ERC20Mock.new(
            TOKEN_NAME,
            TOKEN_SYMBOL,
            user,
            INITIAL_SUPPLY,
        );

        this.tokenLp2 = await ERC20Mock.new(
            TOKEN_NAME,
            TOKEN_SYMBOL,
            user,
            INITIAL_SUPPLY,
        );

        this.farmingPool = await FarmingPool.new(
            this.tokenRewards.address,
            devaddr,
            defiController,
            REWARD_TOKENS_PER_BLOCK,
            (await time.latestBlock()),
            { from: owner });

        this.reservoir = await Reservoir.new(
            this.tokenRewards.address,
            this.farmingPool.address,
        );

        await this.tokenRewards.transfer(
            this.reservoir.address,
            REWARD_TOKENS_SUPPLY,
            { from: owner });

        await this.farmingPool.setDfxReservoir(
            this.reservoir.address,
            { from: owner });

        await this.farmingPool.add(
            ALLOC_POINT_LP_1,
            this.tokenLp1.address,
            false,
            { from: owner });

        await this.farmingPool.add(
            ALLOC_POINT_LP_2,
            this.tokenLp2.address,
            false,
            { from: owner });
    });

    it('should set correct pool length', async function () {
        (await this.farmingPool.poolLength()).should.be.bignumber.equal(new BN(2));
    });

    describe('owner functions', function () {
        it('should call transferOwnership by owner', async function () {
            await this.farmingPool.transferOwnership(testAddress, { from: owner });
            (await this.farmingPool.owner()).should.be.equal(testAddress);
        });

        it('should fail on call transferOwnership by anyone', async function () {
            await expectRevert(
                this.farmingPool.transferOwnership(testAddress, { from: anyone }),
                'Ownable: caller is not the owner'
            );
        });

        it('should call setDfxReservoir by owner', async function () {
            await this.farmingPool.setDfxReservoir(testAddress, { from: owner });
            (await this.farmingPool.dfxReservoir()).should.be.equal(testAddress);
        });

        it('should fail on call setDfxReservoir by anyone', async function () {
            await expectRevert(
                this.farmingPool.setDfxReservoir(testAddress, { from: anyone }),
                'Ownable: caller is not the owner'
            );
        });

        it('should call setDfxPerBlock by owner', async function () {
            await this.farmingPool.setDfxPerBlock(ether('0'), { from: owner });
            (await this.farmingPool.dfxPerBlock()).should.be.zero;
        });

        it('should fail on call setDfxPerBlock by anyone', async function () {
            await expectRevert(
                this.farmingPool.setDfxPerBlock(ether('0'), { from: anyone }),
                'Ownable: caller is not the owner'
            );
        });

        it('should call setDefiController by owner', async function () {
            await this.farmingPool.setDefiController(testAddress, { from: owner });
            (await this.farmingPool.defiController()).should.be.equal(testAddress);
        });

        it('should fail on call setDefiController by anyone', async function () {
            await expectRevert(
                this.farmingPool.setDefiController(testAddress, { from: anyone }),
                'Ownable: caller is not the owner'
            );
        });

        it('should call add a new lp by owner', async function () {
            await this.farmingPool.add(
                ALLOC_POINT_LP_1,
                testAddress,
                false,
                { from: owner });
        });

        it('should fail on call add a new lp by anyone', async function () {
            await expectRevert(
                this.farmingPool.add(
                    ALLOC_POINT_LP_1,
                    testAddress,
                    false,
                    { from: anyone }),
                'Ownable: caller is not the owner'
            );
        });

        it('should call set a new lp by owner', async function () {
            await this.farmingPool.set(
                new BN(0),
                ALLOC_POINT_LP_2,
                true,
                { from: owner });
        });

        it('should fail on call set a new lp by anyone', async function () {
            await expectRevert(
                this.farmingPool.set(
                    new BN(0),
                    ALLOC_POINT_LP_2,
                    true,
                    { from: anyone }),
                'Ownable: caller is not the owner'
            );
        });
    });

    describe('updateDev function', function () {
        it('should call updateDev by devaddr', async function () {
            await this.farmingPool.updateDev(testAddress, { from: devaddr });
            (await this.farmingPool.devaddr()).should.be.equal(testAddress);
        });

        it('should fail on call updateDev by anyone', async function () {
            await expectRevert(
                this.farmingPool.updateDev(testAddress, { from: anyone }),
                'updateDev: permission denied'
            );
        });
    });

    describe('emergencyWithdraw function', function () {
        it('should allow emergency withdraw', async function () {
            await this.tokenLp1.approve(this.farmingPool.address, INITIAL_SUPPLY, { from: user });
    
            await this.farmingPool.deposit(
                new BN(0),
                INITIAL_SUPPLY,
                { from: user });
    
            (await this.tokenLp1.balanceOf(user))
                .should.be.bignumber.equal(ether('0'));
            (await this.tokenLp1.balanceOf(this.farmingPool.address))
                .should.be.bignumber.equal(INITIAL_SUPPLY);

            // skip 3 blocks
            await time.advanceBlock();
            await time.advanceBlock();
            await time.advanceBlock();
    
            await this.farmingPool.emergencyWithdraw(
                new BN(0),
                { from: user });
    
            (await this.tokenLp1.balanceOf(user))
                .should.be.bignumber.equal(INITIAL_SUPPLY);
            (await this.tokenLp1.balanceOf(this.farmingPool.address))
                .should.be.bignumber.equal(ether('0'));
        });
    });

    describe('deposit/withdraw LPs and rewards for user and devaddr', function () {
        it('should be correct for first pool', async function () {
            await this.tokenLp1.approve(this.farmingPool.address, INITIAL_SUPPLY, { from: user });
    
            await this.farmingPool.deposit(
                new BN(0),
                INITIAL_SUPPLY,
                { from: user });
    
            (await this.tokenLp1.balanceOf(user))
                .should.be.bignumber.equal(ether('0'));

            // skip 3 blocks
            await time.advanceBlock();
            await time.advanceBlock();
            await time.advanceBlock();
    
            // 4 blocks after start (next block)
            await this.farmingPool.withdraw(
                new BN(0),
                INITIAL_SUPPLY,
                { from: user });
    
            (await this.tokenLp1.balanceOf(user))
                .should.be.bignumber.equal(INITIAL_SUPPLY);
    
            // LP pool reward: 1 tokens * 4 blocks * 60% = 2.40 tokens
            // for user: reward * 90% = 2.16 tokens
            // for devaddr: reward * 10% = 0.24 tokens
            (await this.tokenRewards.balanceOf(user))
                .should.be.bignumber.equal(ether('2.16'));
            (await this.tokenRewards.balanceOf(devaddr))
                .should.be.bignumber.equal(ether('0.24'));
            (await this.tokenRewards.balanceOf(this.reservoir.address))
                .should.be.bignumber.equal(REWARD_TOKENS_SUPPLY.sub(ether('2.4')));
        });

        it('should be correct for second pool', async function () {
            await this.tokenLp2.approve(this.farmingPool.address, INITIAL_SUPPLY, { from: user });
    
            await this.farmingPool.deposit(
                new BN(1),
                INITIAL_SUPPLY,
                { from: user });
    
            (await this.tokenLp2.balanceOf(user))
                .should.be.bignumber.equal(ether('0'));

            // skip 3 blocks
            await time.advanceBlock();
            await time.advanceBlock();
            await time.advanceBlock();
    
            // 4 blocks after start (next block)
            await this.farmingPool.withdraw(
                new BN(1),
                INITIAL_SUPPLY,
                { from: user });
    
            (await this.tokenLp2.balanceOf(user))
                .should.be.bignumber.equal(INITIAL_SUPPLY);
    
            // LP pool reward: 1 tokens * 4 blocks * 40% = 1.60 tokens
            // for user: reward * 90% = 1.44 tokens
            // for devaddr: reward * 10% = 0.16 tokens
            (await this.tokenRewards.balanceOf(user))
                .should.be.bignumber.equal(ether('1.44'));
            (await this.tokenRewards.balanceOf(devaddr))
                .should.be.bignumber.equal(ether('0.16'));
            (await this.tokenRewards.balanceOf(this.reservoir.address))
                .should.be.bignumber.equal(REWARD_TOKENS_SUPPLY.sub(ether('1.6')));
        });

        it('should be correct for both pools', async function () {
            await this.tokenLp1.approve(this.farmingPool.address, INITIAL_SUPPLY, { from: user });
            await this.tokenLp2.approve(this.farmingPool.address, INITIAL_SUPPLY, { from: user });

            await this.farmingPool.deposit(
                new BN(0),
                INITIAL_SUPPLY,
                { from: user });
            
            // next block
            await this.farmingPool.deposit(
                new BN(1),
                INITIAL_SUPPLY,
                { from: user });

            (await this.tokenLp1.balanceOf(user))
                .should.be.bignumber.equal(ether('0'));
            (await this.tokenLp2.balanceOf(user))
                .should.be.bignumber.equal(ether('0'));

            // skip 3 blocks
            await time.advanceBlock();
            await time.advanceBlock();
            await time.advanceBlock();
    
            // 5 blocks after start (next block)
            await this.farmingPool.withdraw(
                new BN(0),
                INITIAL_SUPPLY,
                { from: user });

            // 5 blocks after start (next block)
            await this.farmingPool.withdraw(
                new BN(1),
                INITIAL_SUPPLY,
                { from: user });

            (await this.tokenLp1.balanceOf(user))
                .should.be.bignumber.equal(INITIAL_SUPPLY); 
            (await this.tokenLp2.balanceOf(user))
                .should.be.bignumber.equal(INITIAL_SUPPLY);
    
            // LP pools reward: 1 tokens * 5 blocks = 5 tokens
            // for user: reward * 90% = 4.5 tokens
            // for devaddr: reward * 10% = 0.5 tokens
            (await this.tokenRewards.balanceOf(user))
                .should.be.bignumber.equal(ether('4.5'));
            (await this.tokenRewards.balanceOf(devaddr))
                .should.be.bignumber.equal(ether('0.5'));
            (await this.tokenRewards.balanceOf(this.reservoir.address))
                .should.be.bignumber.equal(REWARD_TOKENS_SUPPLY.sub(ether('5')));
        });

        it('should be correct after reaching the Reservoir balance', async function () {
            await this.tokenLp1.approve(this.farmingPool.address, INITIAL_SUPPLY, { from: user });
            await this.tokenLp2.approve(this.farmingPool.address, INITIAL_SUPPLY, { from: user });

            await this.farmingPool.deposit(
                new BN(0),
                INITIAL_SUPPLY,
                { from: user });
            
            // next block
            await this.farmingPool.deposit(
                new BN(1),
                INITIAL_SUPPLY,
                { from: user });

            (await this.tokenLp1.balanceOf(user))
                .should.be.bignumber.equal(ether('0'));
            (await this.tokenLp2.balanceOf(user))
                .should.be.bignumber.equal(ether('0'));

            // skip 4 blocks
            await time.advanceBlock();
            await time.advanceBlock();
            await time.advanceBlock();
            await time.advanceBlock();
    
            // 6 blocks after start (next block)
            await this.farmingPool.withdraw(
                new BN(0),
                INITIAL_SUPPLY,
                { from: user });

            // 6 blocks after start (next block)
            await this.farmingPool.withdraw(
                new BN(1),
                INITIAL_SUPPLY,
                { from: user });

            (await this.tokenLp1.balanceOf(user))
                .should.be.bignumber.equal(INITIAL_SUPPLY); 
            (await this.tokenLp2.balanceOf(user))
                .should.be.bignumber.equal(INITIAL_SUPPLY);

            // LP pools reward: 1 tokens * 6 blocks = 6 tokens
            // Reservoir balance = 5 tokens (max)
            // for user: reward * 90% = 4.5 tokens
            // for devaddr: reward * 10% = 0.5 tokens
            (await this.tokenRewards.balanceOf(user))
                .should.be.bignumber.equal(ether('4.5'));
            (await this.tokenRewards.balanceOf(devaddr))
                .should.be.bignumber.equal(ether('0.5'));
            (await this.tokenRewards.balanceOf(this.reservoir.address))
                .should.be.bignumber.equal(REWARD_TOKENS_SUPPLY.sub(ether('5')));
        });
    });

    describe('updatePool and massUpdatePools functions', function () {
        it('should call updatePool after deposit', async function () {
            await this.tokenLp1.approve(this.farmingPool.address, INITIAL_SUPPLY, { from: user });
    
            await this.farmingPool.deposit(
                new BN(0),
                INITIAL_SUPPLY,
                { from: user });
    
            (await this.tokenLp1.balanceOf(user))
                .should.be.bignumber.equal(ether('0'));

            // skip 3 blocks
            await time.advanceBlock();
            await time.advanceBlock();
            await time.advanceBlock();
    
            await this.farmingPool.updatePool(new BN(0), { from: anyone });
        });

        it('should call massUpdatePools after deposit', async function () {
            await this.tokenLp1.approve(this.farmingPool.address, INITIAL_SUPPLY, { from: user });
    
            await this.farmingPool.deposit(
                new BN(0),
                INITIAL_SUPPLY,
                { from: user });
    
            (await this.tokenLp1.balanceOf(user))
                .should.be.bignumber.equal(ether('0'));

            // skip 3 blocks
            await time.advanceBlock();
            await time.advanceBlock();
            await time.advanceBlock();
    
            await this.farmingPool.massUpdatePools({ from: anyone });
        });
    });

    describe('pendingDfx function', function () {
        it('should be equal to claimed tokens', async function () {
            await this.tokenLp1.approve(this.farmingPool.address, INITIAL_SUPPLY, { from: user });
    
            await this.farmingPool.deposit(
                new BN(0),
                INITIAL_SUPPLY,
                { from: user });
    
            (await this.tokenLp1.balanceOf(user))
                .should.be.bignumber.equal(ether('0'));

            // skip 3 blocks
            await time.advanceBlock();
            await time.advanceBlock();
            await time.advanceBlock();
    
            // 3 blocks after start
            let pendingTokens = await this.farmingPool.pendingDfx(new BN(0), user);
    
            // 4 blocks after start (next block)
            await this.farmingPool.withdraw(
                new BN(0),
                INITIAL_SUPPLY,
                { from: user });
    
            (await this.tokenLp1.balanceOf(user))
                .should.be.bignumber.equal(INITIAL_SUPPLY);
    
            // pendingTokens after 3 blocks, real reward after 4 blocks
            (await this.tokenRewards.balanceOf(user))
                .should.be.bignumber.equal(pendingTokens.mul(new BN(4)).div(new BN(3)));
        });

        it('should not be more than the Reservoir balance', async function () {
            await this.tokenLp1.approve(this.farmingPool.address, INITIAL_SUPPLY, { from: user });

            await this.farmingPool.deposit(
                new BN(0),
                INITIAL_SUPPLY,
                { from: user });

            (await this.tokenLp1.balanceOf(user))
                .should.be.bignumber.equal(ether('0'));

            // skip 10 blocks
            await time.advanceBlockTo((await time.latestBlock()).add(new BN(10)));
            
            // LP pools reward: 1 tokens * 10 blocks * 60% = 6 tokens
            // Reservoir balance = 5 tokens (max)
            // only 5 tokens can be distributed (4.5 tokens for user)
            let maxReward = REWARD_TOKENS_SUPPLY.mul(new BN(90)).div(new BN(100));

            (await this.farmingPool.pendingDfx(new BN(0), user))
                .should.be.bignumber.equal(maxReward);

            // skip 1 block
            await time.advanceBlock();

            (await this.farmingPool.pendingDfx(new BN(0), user))
                .should.be.bignumber.equal(maxReward);
        });
    });
});
