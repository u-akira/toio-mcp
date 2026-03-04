/// <reference types="node" />
import { EventEmitter } from 'events';
import { Characteristic } from 'noble-mac';
export interface Event {
    'sensor:slope': (data: {
        isSloped: boolean;
    }) => void;
    'sensor:collision': (data: {
        isCollisionDetected: boolean;
    }) => void;
    'sensor:double-tap': () => void;
    'sensor:orientation': (data: {
        orientation: number;
    }) => void;
    'sensor:shake': (data: {
        level: number;
    }) => void;
    'sensor:magnet-id': (data: {
        id: number;
    }) => void;
    'sensor:magnet-force': (data: {
        force: number;
        directionX: number;
        directionY: number;
        directionZ: number;
    }) => void;
    'sensor:attitude-euler': (data: {
        roll: number;
        pitch: number;
        yaw: number;
    }) => void;
    'sensor:attitude-quaternion': (data: {
        w: number;
        x: number;
        y: number;
        z: number;
    }) => void;
}
export declare class SensorCharacteristic {
    static readonly UUID = "10b201065b3b45719508cf3efcd7bbae";
    private readonly characteristic;
    private readonly eventEmitter;
    private readonly spec;
    private magnetMode;
    private prevMotionStatus;
    private prevMagnetStatus;
    private prevAttitudeEuler;
    private prevAttitudeQuaternion;
    constructor(characteristic: Characteristic, eventEmitter: EventEmitter);
    getSlopeStatus(): Promise<{
        isSloped: boolean;
    }>;
    getCollisionStatus(): Promise<{
        isCollisionDetected: boolean;
    }>;
    getDoubleTapStatus(): Promise<{
        isDoubleTapped: boolean;
    }>;
    getOrientation(): Promise<{
        orientation: number;
    }>;
    getMagnetId(): Promise<{
        id: number;
    }>;
    getMagnetForce(): Promise<{
        force: number;
        directionX: number;
        directionY: number;
        directionZ: number;
    }>;
    getAttitudeEuler(): Promise<{
        roll: number;
        pitch: number;
        yaw: number;
    }>;
    getAttitudeQuaternion(): Promise<{
        w: number;
        x: number;
        y: number;
        z: number;
    }>;
    notifyMotionStatus(): void;
    notifyMagnetStatus(): void;
    setMagnetMode(mode: number): void;
    private onData;
}
