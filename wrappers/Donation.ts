import {
    Address,
    beginCell,
    Cell,
    Contract,
    contractAddress,
    ContractProvider,
    Sender,
    SendMode,
    toNano,
} from '@ton/core';

export type DonationConfig = {
    index?: bigint;
    manager: Address;
    active: bigint;
    hardcap: bigint;
    destination: Address;
    deadline: bigint;
};

export function donationConfigToCell({
    active,
    deadline,
    destination,
    hardcap,
    index = 1n,
    manager,
}: DonationConfig): Cell {
    return beginCell()
        .storeUint(index, 64)
        .storeAddress(manager)
        .storeUint(active, 1)
        .storeCoins(hardcap)
        .storeAddress(destination)
        .storeUint(deadline, 32)
        .endCell();
}

export class Donation implements Contract {
    constructor(
        readonly address: Address,
        readonly init?: { code: Cell; data: Cell },
    ) {}

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

    async getData(provider: ContractProvider) {
        const result = (await provider.get('get_donation_data', [])).stack;

        return {
            wasInited: result.readBigNumber(),
            index: result.readBigNumber(),
            balance: result.readBigNumber(),
            managerAddress: result.readAddress(),
            hardcap: result.readBigNumber(),
            isActive: !!result.readBigNumber(),
            destination: result.readAddress(),
            deadline: result.readBigNumber(),
        };
    }

    async sendDisableDonation(provider: ContractProvider, sender: Sender, value: bigint) {
        await provider.internal(sender, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(0x6, 32).storeUint(1n, 64).endCell(),
        });
    }

    async sendEnableDonation(provider: ContractProvider, sender: Sender, value: bigint) {
        await provider.internal(sender, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(0x10, 32).storeUint(1n, 64).endCell(),
        });
    }

    async sendDonation(provider: ContractProvider, sender: Sender, value: bigint) {
        await provider.internal(sender, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
        });
    }

    async sendUnknownOp(provider: ContractProvider, sender: Sender) {
        await provider.internal(sender, {
            value: toNano('0.05'),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(0x199, 32).storeUint(0x199, 64).endCell(),
        });
    }

    async sendChangeSettings(
        provider: ContractProvider,
        sender: Sender,
        {
            deadline,
            destination,
            hardcap,
        }: {
            hardcap: bigint;
            destination: Address;
            deadline: bigint;
        },
    ) {
        await provider.internal(sender, {
            value: toNano('0.05'),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(0x4, 32)
                .storeUint(0, 64)
                .storeAddress(destination)
                .storeCoins(hardcap)
                .storeUint(deadline, 32)
                .endCell(),
        });
    }
}
