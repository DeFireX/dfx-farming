const { accounts, contract } = require('@openzeppelin/test-environment');

const {
    ether,
    expectRevert,
} = require('@openzeppelin/test-helpers');

require('chai').should();

const DfxToken = contract.fromArtifact('DfxToken');
const DfxStaking = contract.fromArtifact('DfxStaking');

describe('Contract farming/DfxStaking.sol', function () {
    const [
        deployer,
        alice,
        bob
    ] = accounts;

    beforeEach(async function () {
        this.dfxToken = await DfxToken.new(
            deployer,
        );

        this.staking = await DfxStaking.new(
            this.dfxToken.address,
        );

        await this.dfxToken.transfer(
            alice,
            ether('100'),
            { from: deployer });
        
        await this.dfxToken.transfer(
            bob,
            ether('100'),
            { from: deployer });
    });

    it('should not allow enter if not enough approve', async function () {
        await expectRevert(
            this.staking.enter(ether('100'), { from: alice }),
            'transferFrom: transfer amount exceeds spender allowance'
        );

        await this.dfxToken.approve(this.staking.address, ether('50'), { from: alice });
        await expectRevert(
            this.staking.enter(ether('100'), { from: alice }),
            'transferFrom: transfer amount exceeds spender allowance'
        );

        await this.dfxToken.approve(this.staking.address, ether('100'), { from: alice });
        await this.staking.enter(ether('100'), { from: alice });
        (await this.staking.balanceOf(alice)).should.be.bignumber.equal(ether('100'));
    });

    it('should not allow withraw more than what you have', async function () {
        await this.dfxToken.approve(this.staking.address, ether('100'), { from: alice });
        await this.staking.enter(ether('100'), { from: alice });

        await expectRevert(
            this.staking.leave(ether('200'), { from: alice }),
            'ERC20: burn amount exceeds balance'
        );
    });

    it('should work with more than one participant', async function () {
        await this.dfxToken.approve(this.staking.address, ether('100'), { from: alice });
        await this.dfxToken.approve(this.staking.address, ether('100'), { from: bob });

        // // Alice enters and gets 20 shares. Bob enters and gets 10 shares
        await this.staking.enter(ether('20'), { from: alice });
        await this.staking.enter(ether('10'), { from: bob });
        (await this.staking.balanceOf(alice)).should.be.bignumber.equal(ether('20'));
        (await this.staking.balanceOf(bob)).should.be.bignumber.equal(ether('10'));
        (await this.dfxToken.balanceOf(this.staking.address)).should.be.bignumber.equal(ether('30'));
    
        // DfxStaking get 30 more DFXs from an external source
        await this.dfxToken.transfer(
            this.staking.address,
            ether('30'),
            { from: deployer });

        // Alice deposits 10 more DFXs. She should receive 10*30/60 = 5 shares
        await this.staking.enter(ether('10'), { from: alice });
        (await this.staking.balanceOf(alice)).should.be.bignumber.equal(ether('25'));
        (await this.staking.balanceOf(bob)).should.be.bignumber.equal(ether('10'));

        // Bob withdraws 5 shares. He should receive 5*70/35 = 10 DFXs
        await this.staking.leave(ether('5'), { from: bob });
        (await this.staking.balanceOf(alice)).should.be.bignumber.equal(ether('25'));
        (await this.staking.balanceOf(bob)).should.be.bignumber.equal(ether('5'));
        (await this.dfxToken.balanceOf(this.staking.address)).should.be.bignumber.equal(ether('60'));
        (await this.dfxToken.balanceOf(alice)).should.be.bignumber.equal(ether('70'));
        (await this.dfxToken.balanceOf(bob)).should.be.bignumber.equal(ether('100'));
    });
});
