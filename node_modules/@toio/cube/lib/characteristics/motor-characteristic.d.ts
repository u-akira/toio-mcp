/// <reference types="node" />
import { EventEmitter } from 'events';
import { Characteristic } from 'noble-mac';
import { MoveToTarget, MoveToOptions } from './specs/motor-spec';
export interface Event {
    'motor:moveTo-response': (data: {
        operationId: number;
        reason: number;
    }) => void;
    'motor:speed-feedback': (data: {
        left: number;
        right: number;
    }) => void;
}
export declare class MotorCharacteristic {
    static readonly UUID = "10b201025b3b45719508cf3efcd7bbae";
    private readonly characteristic;
    private readonly spec;
    private readonly eventEmitter;
    private bleProtocolVersion?;
    private timer;
    private pendingResolve;
    constructor(characteristic: Characteristic, eventEmitter: EventEmitter);
    init(bleProtocolVersion: string): void;
    move(left: number, right: number, durationMs: number): Promise<void> | void;
    moveTo(targets: MoveToTarget[], options: MoveToOptions): Promise<void>;
    accelerationMove(translationSpeed: number, rotationSpeed: number, acceleration: number, priorityType: number, durationMs: number): Promise<void> | void;
    stop(): void;
    private onData;
}
