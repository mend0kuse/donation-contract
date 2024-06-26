import { toNano } from '@ton/core';
import { DonationManager } from '../wrappers/DonationManager';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const donationManager = provider.open(DonationManager.createFromConfig({}, await compile('DonationManager')));

    await donationManager.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(donationManager.address);

    // run methods on `donationManager`
}
