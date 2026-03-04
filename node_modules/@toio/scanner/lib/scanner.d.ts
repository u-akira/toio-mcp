import TypedEmitter from 'typed-emitter';
import noble from 'noble-mac';
import { Cube } from '@toio/cube';
interface Event {
    start: () => void;
    stop: () => void;
    discover: (cube: Cube) => void;
}
export declare abstract class Scanner {
    protected static readonly DEFAULT_TIMEOUT_MS: number;
    private readonly timeoutMs;
    protected eventEmitter: TypedEmitter<Event>;
    private timeoutTimer;
    constructor(timeoutMs?: number);
    start(): Promise<Cube | Cube[]>;
    stop(): void;
    on<E extends keyof Event>(event: E, listener: Event[E]): this;
    off<E extends keyof Event>(event: E, listener: Event[E]): this;
    protected abstract onDiscover(peripheral: noble.Peripheral): void;
    protected abstract executor(resolve: (value: Cube | Cube[]) => void, reject: (reason?: string) => void): void;
    protected onStateChange(state: string): void;
    private createTimeoutPromise;
}
export {};
