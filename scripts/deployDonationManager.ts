import { Address, toNano } from '@ton/core';
import { DonationManager } from '../wrappers/DonationManager';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const donationCode = await compile('Donation');
    const donationManager = provider.open(
        DonationManager.createFromConfig(
            {
                item_code: donationCode,
                owner: Address.parse('0QAxi0Nk6DAGl-8p8dUJHBevg5XrrJYcDbSUDyjcuBZfzueZ'),
            },
            await compile('DonationManager'),
        ),
    );

    await donationManager.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(donationManager.address);

    // run methods on `donationManager`
}
