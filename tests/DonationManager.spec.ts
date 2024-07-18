import { Donation } from './../wrappers/Donation';
import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, TupleBuilder, beginCell, contractAddress, serializeTuple, toNano } from '@ton/core';
import { DonationManager } from '../wrappers/DonationManager';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';
import { findTransaction } from '@ton/test-utils';

describe('DonationManager', () => {
    let donationCode: Cell;
    let donationManagerCode: Cell;

    beforeAll(async () => {
        donationManagerCode = await compile('DonationManager');
        donationCode = await compile('Donation');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let donationManagerContract: SandboxContract<DonationManager>;

    let newAdmin: SandboxContract<TreasuryContract>;
    let newAdmin2: SandboxContract<TreasuryContract>;
    let newAdmin3: SandboxContract<TreasuryContract>;
    let donationAuthor: SandboxContract<TreasuryContract>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        deployer = await blockchain.treasury('deployer');

        newAdmin = await blockchain.treasury('admin');
        newAdmin2 = await blockchain.treasury('admin2');
        newAdmin3 = await blockchain.treasury('admin3');
        donationAuthor = await blockchain.treasury('destination');

        donationManagerContract = blockchain.openContract(
            DonationManager.createFromConfig(
                {
                    owner: deployer.address,
                    item_code: donationCode,
                },
                donationManagerCode,
            ),
        );

        const deployResult = await donationManagerContract.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: donationManagerContract.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and donationManager are ready to use
    });

    describe('owner flow', () => {
        it('deployer must be owner', async () => {
            expect((await donationManagerContract.getData()).owner).toEqualAddress(deployer.address);
        });

        it('should change owner', async () => {
            const newOwner = await blockchain.treasury('newOwner');

            await deployer.send({
                to: donationManagerContract.address,
                value: toNano('0.05'),
                body: beginCell().storeUint(0x8, 32).storeUint(1n, 64).storeAddress(newOwner.address).endCell(),
            });

            expect((await donationManagerContract.getData()).owner).toEqualAddress(newOwner.address);
        });

        it('should forbid to change owner', async () => {
            const newOwner = await blockchain.treasury('newOwner');

            await newOwner.send({
                to: donationManagerContract.address,
                value: toNano('0.05'),
                body: beginCell().storeUint(0x8, 32).storeUint(1n, 64).storeAddress(newOwner.address).endCell(),
            });

            const realOwner = (await donationManagerContract.getData()).owner;

            expect(realOwner).not.toEqualAddress(newOwner.address);
            expect(realOwner).toEqualAddress(deployer.address);
        });
    });

    describe('admin flow', () => {
        it('should add admins', async () => {
            const tuple_builder = new TupleBuilder();

            tuple_builder.writeAddress(newAdmin.address);
            tuple_builder.writeAddress(newAdmin2.address);
            tuple_builder.writeAddress(newAdmin3.address);

            await donationManagerContract.sendAddAdmins(
                deployer.getSender(),
                toNano('0.05'),
                serializeTuple(tuple_builder.build()),
            );

            const admins = (await donationManagerContract.getData()).admins;

            expect(admins.get(newAdmin.address)).toBeDefined();
            expect(admins.get(newAdmin2.address)).toBeDefined();
            expect(admins.get(newAdmin3.address)).toBeDefined();
        });

        it('should forbid to add admin', async () => {
            const tuple_builder = new TupleBuilder();
            tuple_builder.writeAddress(newAdmin.address);

            await donationManagerContract.sendAddAdmins(
                newAdmin.getSender(),
                toNano('0.05'),
                serializeTuple(tuple_builder.build()),
            );

            const admins = (await donationManagerContract.getData()).admins;

            expect(admins.get(newAdmin.address)).toBeUndefined();
        });

        it('should remove admin', async () => {
            const tuple_builder = new TupleBuilder();
            tuple_builder.writeAddress(newAdmin.address);
            tuple_builder.writeAddress(newAdmin2.address);

            await donationManagerContract.sendAddAdmins(
                deployer.getSender(),
                toNano('0.05'),
                serializeTuple(tuple_builder.build()),
            );

            const tuple_builder_remove = new TupleBuilder();
            tuple_builder_remove.writeAddress(newAdmin2.address);

            await donationManagerContract.sendRemoveAdmins(
                deployer.getSender(),
                toNano('0.05'),
                serializeTuple(tuple_builder_remove.build()),
            );

            const admins = (await donationManagerContract.getData()).admins;

            expect(admins.get(newAdmin.address)).toBeDefined();
            expect(admins.get(newAdmin2.address)).toBeUndefined();
        });

        it('should forbid to remove admin', async () => {
            const tuple_builder = new TupleBuilder();
            tuple_builder.writeAddress(newAdmin2.address);

            await donationManagerContract.sendAddAdmins(
                deployer.getSender(),
                toNano('0.05'),
                serializeTuple(tuple_builder.build()),
            );

            const tuple_builder_remove = new TupleBuilder();
            tuple_builder_remove.writeAddress(newAdmin2.address);

            await donationManagerContract.sendRemoveAdmins(
                newAdmin.getSender(),
                toNano('0.05'),
                serializeTuple(tuple_builder_remove.build()),
            );

            const admins = (await donationManagerContract.getData()).admins;
            expect(admins.get(newAdmin2.address)).toBeDefined();
        });
    });

    it('should check manage rights', async () => {
        const tuple_builder = new TupleBuilder();
        tuple_builder.writeAddress(newAdmin.address);

        await donationManagerContract.sendAddAdmins(
            deployer.getSender(),
            toNano('0.05'),
            serializeTuple(tuple_builder.build()),
        );

        const [isOwner, isAdmin] = await donationManagerContract.getManagerRights(deployer.address);
        expect(isOwner).toBeTruthy();
        expect(isAdmin).toBeTruthy();

        const [isOwner2, isAdmin2] = await donationManagerContract.getManagerRights(newAdmin.address);
        expect(isOwner2).toBeFalsy();
        expect(isAdmin2).toBeTruthy();

        const [isOwner3, isAdmin3] = await donationManagerContract.getManagerRights(newAdmin2.address);
        expect(isOwner3).toBeFalsy();
        expect(isAdmin3).toBeFalsy();
    });

    it('should create donation', async () => {
        const index = 1n;
        const preparedDeadline = BigInt(Math.ceil((Date.now() + 1000 * 60 * 60) / 1000));

        const initData = beginCell().storeUint(index, 64).storeAddress(donationManagerContract.address).endCell();
        const expectedAddress = contractAddress(0, { code: donationCode, data: initData });

        const result = await donationManagerContract.sendCreateDonation(deployer.getSender(), toNano('0.05'), {
            deadline: preparedDeadline,
            destination: donationAuthor.address,
            hardcap: toNano('100'),
        });

        const foundedAddress = await donationManagerContract.getDonationByIndex(index);

        const deployTransaction = findTransaction(result.transactions, {
            to: expectedAddress,
            from: donationManagerContract.address,
            deploy: true,
            success: true,
            initCode: donationCode,
            initData,
        });

        expect(deployTransaction).toBeDefined();
        expect(expectedAddress).toEqualAddress(foundedAddress);
    });
});
