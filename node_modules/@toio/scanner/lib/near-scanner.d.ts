import { Peripheral } from 'noble-mac';
import { Cube } from '@toio/cube';
import { Scanner } from './scanner';
export declare class NearScanner extends Scanner {
    protected static readonly SCAN_WINDOW_MS: number;
    private readonly peripherals;
    private readonly numberOfCoreCubes;
    private scanningIntervalTimer;
    constructor(numberOfCoreCubes?: number, timeoutMs?: number);
    stop(): void;
    protected onDiscover(peripheral: Peripheral): void;
    protected executor(resolve: (value: Cube | Cube[]) => void): void;
}
