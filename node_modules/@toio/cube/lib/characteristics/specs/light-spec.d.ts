export interface LightOperation {
    durationMs: number;
    red: number;
    green: number;
    blue: number;
}
export interface TurnOnLightType {
    buffer: Uint8Array;
    data: LightOperation;
}
export interface TurnOnLightWithScenarioType {
    buffer: Uint8Array;
    data: {
        operations: LightOperation[];
        repeatCount: number;
        totalDurationMs: number;
    };
}
export interface TurnOffLightType {
    buffer: Uint8Array;
}
export declare class LightSpec {
    turnOnLight(operation: LightOperation): TurnOnLightType;
    turnOnLightWithScenario(operations: LightOperation[], repeatCount: number): TurnOnLightWithScenarioType;
    turnOffLight(): TurnOffLightType;
}
