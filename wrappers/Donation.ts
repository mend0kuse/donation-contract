import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type DonationConfig = {};

export function donationConfigToCell(config: DonationConfig): Cell {
    return beginCell().endCell();
}

export class Donation implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new Donation(address);
    }

    static createFromConfig(config: DonationConfig, code: Cell, workchain = 0) {
        const data = donationConfigToCell(config);
        const init = { code, data };
        return new Donation(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }
}
