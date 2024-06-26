import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano } from '@ton/core';
import { Donation } from '../wrappers/Donation';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

describe('Donation', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('Donation');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let donation: SandboxContract<Donation>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        donation = blockchain.openContract(Donation.createFromConfig({}, code));

        deployer = await blockchain.treasury('deployer');

        const deployResult = await donation.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: donation.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and donation are ready to use
    });
});
