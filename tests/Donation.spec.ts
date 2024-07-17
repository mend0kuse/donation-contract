import { Donation } from '../wrappers/Donation';
import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano } from '@ton/core';
import { DonationManager } from '../wrappers/DonationManager';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

describe('Donation', () => {
    let donationCode: Cell;
    let donationManagerCode: Cell;

    beforeAll(async () => {
        donationManagerCode = await compile('DonationManager');
        donationCode = await compile('Donation');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let donationManagerContract: SandboxContract<DonationManager>;
    let donationContract: SandboxContract<Donation>;
    let donationAuthor: SandboxContract<TreasuryContract>;
    let donator1: SandboxContract<TreasuryContract>;
    let donator2: SandboxContract<TreasuryContract>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        deployer = await blockchain.treasury('deployer');
        donationAuthor = await blockchain.treasury('destination');
        donator1 = await blockchain.treasury('donator1');
        donator2 = await blockchain.treasury('donator2');

        donationManagerContract = blockchain.openContract(
            DonationManager.createFromConfig(
                {
                    owner: deployer.address,
                    item_code: donationCode,
                },
                donationManagerCode,
            ),
        );

        await donationManagerContract.sendDeploy(deployer.getSender(), toNano('0.05'));

        donationContract = blockchain.openContract(
            Donation.createFromConfig(
                {
                    active: 1n,
                    manager: donationManagerContract.address,
                    deadline: BigInt(Math.ceil((Date.now() + 1000 * 60 * 60) / 1000)),
                    hardcap: toNano('100'),
                    index: 1n,
                    destination: donationAuthor.address,
                },
                donationCode,
            ),
        );

        await donationContract.sendDeploy(deployer.getSender(), toNano('0.05'));
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and donationContract are ready to use
    });

    it('should disabling', async () => {
        const { isActive: isActiveFirst } = await donationContract.getData();
        expect(isActiveFirst).toBeTruthy();

        const result = await donationContract.sendDisableDonation(
            blockchain.sender(donationManagerContract.address),
            toNano('0.05'),
        );

        expect(result.transactions).toHaveTransaction({
            from: donationManagerContract.address,
            to: donationContract.address,
            success: true,
            op: 0x6,
        });

        const { isActive: isActiveSecond } = await donationContract.getData();
        expect(isActiveSecond).toBeFalsy();
    });

    it('should enabling', async () => {
        await donationContract.sendDisableDonation(blockchain.sender(donationManagerContract.address), toNano('0.05'));
        const { isActive: isActiveSecond } = await donationContract.getData();
        expect(isActiveSecond).toBeFalsy();

        await donationContract.sendEnableDonation(blockchain.sender(donationManagerContract.address), toNano('0.05'));
        const { isActive: isActiveThird } = await donationContract.getData();
        expect(isActiveThird).toBeTruthy();
    });

    it('change data', async () => {
        const newOwner = await blockchain.treasury('newOwner');

        const new_data = {
            deadline: BigInt(Math.ceil((Date.now() + 1000 * 60 * 60 * 2) / 1000)),
            hardcap: toNano('200'),
            destination: newOwner.address,
        };

        const { deadline, hardcap, destination } = await donationContract.getData();

        expect({ deadline, hardcap, destination }).not.toStrictEqual(new_data);

        const result = await donationContract.sendChangeSettings(donationAuthor.getSender(), new_data);

        expect(result.transactions).toHaveTransaction({
            success: true,
            op: 4,
            from: donationAuthor.address,
            to: donationContract.address,
        });

        const {
            deadline: newDeadline,
            hardcap: newHardcap,
            destination: newDestination,
        } = await donationContract.getData();

        expect(new_data.deadline).toBe(newDeadline);
        expect(new_data.hardcap).toBe(newHardcap);
        expect(new_data.destination).toEqualAddress(newDestination);
    });

    describe('donate', () => {
        it('should donates', async () => {
            const donationAmount = toNano('10');
            const donatorBalanceBefore = await donator1.getBalance();

            const { balance: contractBalance } = await donationContract.getData();
            expect(contractBalance).toBeLessThanOrEqual(donationAmount);

            await donationContract.sendDonation(donator1.getSender(), donationAmount);
            const donatorBalanceAfter = await donator1.getBalance();
            expect(donatorBalanceBefore - donatorBalanceAfter).toBeGreaterThanOrEqual(donationAmount);

            const { balance: contractBalance2 } = await donationContract.getData();
            expect(contractBalance2).toBeGreaterThanOrEqual(donationAmount);
        });
    });

    it('should handle unknown op', async () => {
        const result = await donationContract.sendUnknownOp(donationAuthor.getSender());

        expect(result.transactions).toHaveTransaction({
            from: donationAuthor.address,
            to: donationContract.address,
            success: false,
            op: 0x199,
            exitCode: 0xffff,
        });
    });
});
