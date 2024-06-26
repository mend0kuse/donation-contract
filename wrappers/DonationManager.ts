import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type DonationManagerConfig = {};

export function donationManagerConfigToCell(config: DonationManagerConfig): Cell {
    return beginCell().endCell();
}

export class DonationManager implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new DonationManager(address);
    }

    static createFromConfig(config: DonationManagerConfig, code: Cell, workchain = 0) {
        const data = donationManagerConfigToCell(config);
        const init = { code, data };
        return new DonationManager(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }
}
