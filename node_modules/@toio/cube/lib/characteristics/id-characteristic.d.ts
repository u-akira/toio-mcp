/// <reference types="node" />
import { EventEmitter } from 'events';
import { Characteristic } from 'noble-mac';
import { PositionIdInfo, StandardIdInfo } from './specs/id-spec';
export interface Event {
    'id:position-id': (info: PositionIdInfo) => void;
    'id:standard-id': (info: StandardIdInfo) => void;
    'id:position-id-missed': () => void;
    'id:standard-id-missed': () => void;
}
export declare class IdCharacteristic {
    static readonly UUID = "10b201015b3b45719508cf3efcd7bbae";
    private readonly characteristic;
    private readonly eventEmitter;
    constructor(characteristic: Characteristic, eventEmitter: EventEmitter);
    private onData;
}
