import { Characteristic } from 'noble-mac';
export declare class ConfigurationCharacteristic {
    static readonly UUID = "10b201ff5b3b45719508cf3efcd7bbae";
    private readonly characteristic;
    private readonly eventEmitter;
    private bleProtocolVersion?;
    constructor(characteristic: Characteristic);
    init(bleProtocolVersion: string): void;
    getBLEProtocolVersion(): Promise<string>;
    setFlatThreshold(degree: number): void;
    setCollisionThreshold(threshold: number): void;
    setDoubleTapIntervalThreshold(threshold: number): void;
    setIdNotification(intervalMs: number, notificationType: number): void;
    setIdMissedNotification(sensitivityMs: number): void;
    setMotorSpeedFeedback(enable: boolean): void;
    setMagnetDetection(detectType: number, intervalMs: number, notificationType: number): void;
    setAttitudeControl(format: number, intervalMs: number, notificationType: number): void;
    private data2result;
    private onData;
}
