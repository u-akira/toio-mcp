import { Peripheral } from 'noble-mac';
import { Event, LightOperation, SoundOperation } from './characteristics';
import { MoveToTarget, MoveToOptions } from './characteristics/specs/motor-spec';
export declare class Cube {
    static readonly TOIO_SERVICE_ID = "10b201005b3b45719508cf3efcd7bbae";
    private readonly eventEmitter;
    private readonly peripheral;
    private motorCharacteristic;
    private lightCharacteristic;
    private soundCharacteristic;
    private sensorCharacteristic;
    private buttonCharacteristic;
    private batteryCharacteristic;
    private configurationCharacteristic;
    constructor(peripheral: Peripheral);
    get id(): string;
    get address(): string;
    connect(): Promise<Cube>;
    disconnect(): Promise<void>;
    on<E extends keyof Event>(event: E, listener: Event[E]): this;
    off<E extends keyof Event>(event: E, listener: Event[E]): this;
    move(left: number, right: number, duration?: number): Promise<void> | void;
    moveTo(targets: MoveToTarget[], options?: MoveToOptions): Promise<void>;
    accelerationMove(translationSpeed: number, rotationSpeed: number, acceleration?: number, priorityType?: number, durationMs?: number): Promise<void> | void;
    stop(): void;
    turnOnLight(operation: LightOperation): Promise<void> | void;
    turnOnLightWithScenario(operations: LightOperation[], repeatCount?: number): Promise<void> | void;
    turnOffLight(): void;
    playPresetSound(soundId: number): void;
    playSound(operations: SoundOperation[], repeatCount?: number): Promise<void> | void;
    stopSound(): void;
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
    getButtonStatus(): Promise<{
        pressed: boolean;
    }>;
    getBatteryStatus(): Promise<{
        level: number;
    }>;
    getBLEProtocolVersion(): Promise<string>;
    setFlatThreshold(degree: number): void;
    setCollisionThreshold(threshold: number): void;
    setIdNotification(intervalMs: number, notificationType: number): void;
    setIdMissedNotification(sensitivityMs: number): void;
    setDoubleTapIntervalThreshold(threshold: number): void;
    setMotorSpeedFeedback(enable: boolean): void;
    setMagnetDetection(detectType: number, intervalMs: number, notificationType?: number): void;
    setAttitudeControl(format: number, intervalMs: number, notificationType: number): void;
    private setCharacteristics;
    private initCharacteristics;
}
