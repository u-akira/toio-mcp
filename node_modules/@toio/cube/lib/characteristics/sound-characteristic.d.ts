import { Characteristic } from 'noble-mac';
import { SoundOperation } from './specs/sound-spec';
export declare class SoundCharacteristic {
    static readonly UUID = "10b201045b3b45719508cf3efcd7bbae";
    private readonly characteristic;
    private readonly spec;
    private timer;
    private pendingResolve;
    constructor(characteristic: Characteristic);
    playPresetSound(soundId: number): void;
    playSound(operations: SoundOperation[], repeatCount?: number): Promise<void> | void;
    stopSound(): void;
}
