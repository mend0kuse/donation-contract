import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano } from '@ton/core';
import { DonationManager } from '../wrappers/DonationManager';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

describe('DonationManager', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('DonationManager');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let donationManager: SandboxContract<DonationManager>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        donationManager = blockchain.openContract(DonationManager.createFromConfig({}, code));

        deployer = await blockchain.treasury('deployer');

        const deployResult = await donationManager.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: donationManager.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and donationManager are ready to use
    });
});
