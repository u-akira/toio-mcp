import { Peripheral } from 'noble-mac';
import { Cube } from '@toio/cube';
import { Scanner } from './scanner';
export declare class NearestScanner extends Scanner {
    protected static readonly SCAN_WINDOW_MS: number;
    private scanWindowMs;
    private nearestPeripheral;
    private scanningIntervalTimer;
    constructor(scanWindowMs?: number, timeoutMs?: number);
    stop(): void;
    protected onDiscover(peripheral: Peripheral): void;
    protected executor(resolve: (value: Cube | Cube[]) => void): void;
}
