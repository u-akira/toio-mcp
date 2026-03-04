/// <reference types="node" />
import { EventEmitter } from 'events';
import { Characteristic } from 'noble-mac';
export interface Event {
    'battery:battery': (info: {
        level: number;
    }) => void;
}
export declare class BatteryCharacteristic {
    static readonly UUID = "10b201085b3b45719508cf3efcd7bbae";
    private readonly characteristic;
    private readonly eventEmitter;
    private readonly spec;
    constructor(characteristic: Characteristic, eventEmitter: EventEmitter);
    getBatteryStatus(): Promise<{
        level: number;
    }>;
    private read;
    private onData;
}
