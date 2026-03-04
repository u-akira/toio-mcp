import { Characteristic } from 'noble-mac';
import { LightOperation } from './specs/light-spec';
export declare class LightCharacteristic {
    static readonly UUID = "10b201035b3b45719508cf3efcd7bbae";
    private readonly characteristic;
    private readonly spec;
    private timer;
    private pendingResolve;
    constructor(characteristic: Characteristic);
    turnOnLight(operation: LightOperation): Promise<void> | void;
    turnOnLightWithScenario(operations: LightOperation[], repeatCount?: number): Promise<void> | void;
    turnOffLight(): void;
}
