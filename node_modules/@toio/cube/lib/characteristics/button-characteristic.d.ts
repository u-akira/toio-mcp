/// <reference types="node" />
import { EventEmitter } from 'events';
import { Characteristic } from 'noble-mac';
export interface Event {
    'button:press': (data: {
        pressed: boolean;
    }) => void;
}
export declare class ButtonCharacteristic {
    static readonly UUID = "10b201075b3b45719508cf3efcd7bbae";
    private readonly characteristic;
    private readonly eventEmitter;
    private readonly spec;
    constructor(characteristic: Characteristic, eventEmitter: EventEmitter);
    getButtonStatus(): Promise<{
        pressed: boolean;
    }>;
    private read;
    private onData;
}
