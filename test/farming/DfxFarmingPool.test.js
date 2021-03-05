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
    const INITIAL_SUPPLY = ether('10000000');

    const REWARD_TOKENS_SUPPLY = ether('1000');
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

    describe('owner functions tests', function () {
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
                ether('0'),
                ALLOC_POINT_LP_2,
                true,
                { from: owner });
        });

        it('should fail on call set a new lp by anyone', async function () {
            await expectRevert(
                this.farmingPool.set(
                    ether('0'),
                    ALLOC_POINT_LP_2,
                    true,
                    { from: anyone }),
                'Ownable: caller is not the owner'
            );
        });
    });
    
});