import { toNano } from '@ton/core';
import { Donation } from '../wrappers/Donation';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const donation = provider.open(Donation.createFromConfig({}, await compile('Donation')));

    await donation.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(donation.address);
}
