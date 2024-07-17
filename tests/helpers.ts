import { Cell } from '@ton/core';

export const parseDonationStake = (cell: Cell | null | undefined) => {
    return cell ? cell.beginParse().loadCoins() : null;
};
