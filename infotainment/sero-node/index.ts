/**
 * sero-node — Node.js bindings for the sero protocol library.
 *
 * Provides a POSIX UDP transport (unicast + multicast) and wraps the
 * sero::Runtime C++ API for use from JavaScript / TypeScript.
 *
 * @example
 * ```ts
 * import { SeroRuntime, ReturnCode } from './index';
 *
 * const rt = new SeroRuntime({ port: 30491, clientId: 0x7701 });
 *
 * // Consumer: discover remote services
 * rt.onServiceFound((serviceId, address) => {
 *   console.log(`Found 0x${serviceId.toString(16)} at ${address.ip}:${address.port}`);
 * });
 * rt.findService(0x0001);
 *
 * // Poll the protocol at ~100 Hz
 * setInterval(() => rt.process(), 10);
 * ```
 *
 * @module sero-node
 */

// ── Load the native addon ───────────────────────────────────────

const bindings: NativeModule = require("./build/Release/sero-node.node");

// ── Types ───────────────────────────────────────────────────────

/** Transport address: IPv4 + UDP port. */
export interface Address {
  ip: string;
  port: number;
}

/** Result of a completed request. */
export interface RequestResult {
  /** One of the ReturnCode values. */
  returnCode: number;
  /** Response payload (empty Buffer when no payload). */
  payload: Buffer;
}

/** Service handler — implement to expose a service. */
export interface ServiceHandler {
  /**
   * Called for each incoming REQUEST or REQUEST_NO_RETURN.
   * Return `{ returnCode, response? }`.
   *
   * For fire-and-forget calls the return value is ignored.
   */
  onRequest(
    methodId: number,
    payload: Buffer
  ): { returnCode: number; response?: Buffer };

  /** Optional readiness gate — return `false` to reject requests with E_NOT_READY. */
  isReady?(): boolean;
}

/** Stored Diagnostic Trouble Code. */
export interface Dtc {
  code: number;
  severity: number;
  occurrenceCount: number;
  firstSeenMs: number;
  lastSeenMs: number;
}

/** Snapshot of all diagnostic counters. */
export interface DiagnosticsSnapshot {
  crcErrors: number;
  versionMismatches: number;
  oversizedPayloads: number;
  typeIdMismatches: number;
  duplicateMessages: number;
  staleMessages: number;
  authFailures: number;
  unknownMessageTypes: number;
  droppedMessages: number;
  pendingRequests: number;
}

/** Options for `registerService()`. */
export interface RegisterServiceOptions {
  majorVersion?: number;
  minorVersion?: number;
  authRequired?: boolean;
}

/** Constructor options. */
export interface SeroRuntimeOptions {
  /** IPv4 address to bind (default `"0.0.0.0"`). */
  bindIp?: string;
  /** UDP port for unicast traffic. */
  port: number;
  /** Unique client identifier for this runtime instance. */
  clientId: number;
}

// ── Native module shape (internal) ──────────────────────────────

interface NativeModule {
  SeroRuntime: new (opts: SeroRuntimeOptions) => NativeSeroRuntime;
  ReturnCode: Record<string, number>;
  DtcSeverity: Record<string, number>;
  DiagnosticCounter: Record<string, number>;
  MessageType: Record<string, number>;
}

interface NativeSeroRuntime {
  process(nowMs?: number): void;
  destroy(): void;

  registerService(
    serviceId: number,
    handler: ServiceHandler,
    options?: RegisterServiceOptions
  ): boolean;
  unregisterService(serviceId: number): boolean;
  offerService(serviceId: number, ttlSeconds?: number): boolean;
  stopOffer(serviceId: number): void;

  registerEvent(serviceId: number, eventId: number): boolean;
  notifyEvent(serviceId: number, eventId: number, payload: Buffer): boolean;

  findService(serviceId: number, majorVersion?: number): boolean;

  request(
    serviceId: number,
    methodId: number,
    payload: Buffer,
    timeoutMs?: number
  ): Promise<RequestResult>;
  requestTo(
    address: Address,
    serviceId: number,
    methodId: number,
    payload: Buffer,
    timeoutMs?: number
  ): Promise<RequestResult>;
  fireAndForget(
    serviceId: number,
    methodId: number,
    payload?: Buffer
  ): boolean;

  subscribeEvent(
    serviceId: number,
    eventId: number,
    handler: (serviceId: number, eventId: number, payload: Buffer) => void,
    ttlSeconds?: number
  ): boolean;
  unsubscribeEvent(serviceId: number, eventId: number): boolean;

  onServiceFound(
    cb: (serviceId: number, address: Address) => void
  ): void;
  onServiceLost(cb: (serviceId: number) => void): void;
  onSubscriptionAck(
    cb: (
      serviceId: number,
      eventId: number,
      returnCode: number,
      grantedTtl: number
    ) => void
  ): void;

  setHmacKey(peer: Address, key: Buffer): boolean;

  onDiagnostic(
    cb: (counter: string, header: Buffer | null) => void
  ): void;
  getDiagnostics(): DiagnosticsSnapshot;
  enableDiagnostics(authRequired?: boolean): boolean;

  reportDtc(code: number, severity: number): boolean;
  clearDtc(code: number): boolean;
  clearAllDtcs(): void;
  getDtcs(): Dtc[];

  setLocalAddress(address: Address): void;
  getLocalAddress(): Address;
}

// ── Public API (re-export the native class with TS types) ───────

/**
 * Main entry point — wraps a sero::Runtime with an embedded UDP transport.
 *
 * Call `process()` at a regular interval (e.g.  `setInterval(() => rt.process(), 10)`)
 * to drive the protocol state machine (service discovery, request timeouts,
 * event fan-out, etc.).
 */
export class SeroRuntime {
  private native: NativeSeroRuntime;

  constructor(options: SeroRuntimeOptions) {
    this.native = new bindings.SeroRuntime(options);
  }

  // ── Lifecycle ───────────────────────────────────────────────

  /** Drive one protocol cycle.  Pass a custom monotonic timestamp (ms) or omit to use the system clock. */
  process(nowMs?: number): void {
    this.native.process(nowMs);
  }

  /** Release all resources (sockets, pending promises, registered services). */
  destroy(): void {
    this.native.destroy();
  }

  // ── Provider API ────────────────────────────────────────────

  /** Register a service implementation. */
  registerService(
    serviceId: number,
    handler: ServiceHandler,
    options?: RegisterServiceOptions
  ): boolean {
    return this.native.registerService(serviceId, handler, options);
  }

  /** Unregister a previously registered service. */
  unregisterService(serviceId: number): boolean {
    return this.native.unregisterService(serviceId);
  }

  /** Start offering a service via Service Discovery. */
  offerService(serviceId: number, ttlSeconds?: number): boolean {
    return this.native.offerService(serviceId, ttlSeconds);
  }

  /** Stop offering a service. */
  stopOffer(serviceId: number): void {
    this.native.stopOffer(serviceId);
  }

  /** Register an event that this device can produce (provider side). */
  registerEvent(serviceId: number, eventId: number): boolean {
    return this.native.registerEvent(serviceId, eventId);
  }

  /** Push a notification to all subscribers of a provider-side event. */
  notifyEvent(
    serviceId: number,
    eventId: number,
    payload: Buffer = Buffer.alloc(0)
  ): boolean {
    return this.native.notifyEvent(serviceId, eventId, payload);
  }

  // ── Consumer API ────────────────────────────────────────────

  /** Start searching for a remote service via SD. */
  findService(serviceId: number, majorVersion?: number): boolean {
    return this.native.findService(serviceId, majorVersion);
  }

  /**
   * Send a REQUEST and return a Promise that resolves when the RESPONSE
   * (or ERROR / timeout) arrives during a future `process()` call.
   */
  request(
    serviceId: number,
    methodId: number,
    payload: Buffer = Buffer.alloc(0),
    timeoutMs?: number
  ): Promise<RequestResult> {
    return this.native.request(serviceId, methodId, payload, timeoutMs);
  }

  /** Like `request()` but targets an explicit address (bypasses SD lookup). */
  requestTo(
    address: Address,
    serviceId: number,
    methodId: number,
    payload: Buffer = Buffer.alloc(0),
    timeoutMs?: number
  ): Promise<RequestResult> {
    return this.native.requestTo(
      address,
      serviceId,
      methodId,
      payload,
      timeoutMs
    );
  }

  /** Fire-and-forget request — no response expected. */
  fireAndForget(
    serviceId: number,
    methodId: number,
    payload: Buffer = Buffer.alloc(0)
  ): boolean {
    return this.native.fireAndForget(serviceId, methodId, payload);
  }

  /** Subscribe to a remote event (consumer side). */
  subscribeEvent(
    serviceId: number,
    eventId: number,
    handler: (serviceId: number, eventId: number, payload: Buffer) => void,
    ttlSeconds?: number
  ): boolean {
    return this.native.subscribeEvent(serviceId, eventId, handler, ttlSeconds);
  }

  /** Unsubscribe from a remote event. */
  unsubscribeEvent(serviceId: number, eventId: number): boolean {
    return this.native.unsubscribeEvent(serviceId, eventId);
  }

  // ── Service Discovery callbacks ─────────────────────────────

  /** Called when a service is found via SD. */
  onServiceFound(
    callback: (serviceId: number, address: Address) => void
  ): void {
    this.native.onServiceFound(callback);
  }

  /** Called when a service TTL expires (service lost). */
  onServiceLost(callback: (serviceId: number) => void): void {
    this.native.onServiceLost(callback);
  }

  /** Called when an event subscription ACK is received. */
  onSubscriptionAck(
    callback: (
      serviceId: number,
      eventId: number,
      returnCode: number,
      grantedTtl: number
    ) => void
  ): void {
    this.native.onSubscriptionAck(callback);
  }

  // ── Security ────────────────────────────────────────────────

  /** Set the HMAC-SHA256 key for a peer address (32 bytes). */
  setHmacKey(peer: Address, key: Buffer): boolean {
    return this.native.setHmacKey(peer, key);
  }

  // ── Diagnostics ─────────────────────────────────────────────

  /** Register a callback fired when any diagnostic counter is incremented. */
  onDiagnostic(
    callback: (counter: string, header: Buffer | null) => void
  ): void {
    this.native.onDiagnostic(callback);
  }

  /** Read all diagnostic counters as a snapshot object. */
  getDiagnostics(): DiagnosticsSnapshot {
    return this.native.getDiagnostics();
  }

  /** Enable the built-in diagnostics service (0xFFFE). */
  enableDiagnostics(authRequired?: boolean): boolean {
    return this.native.enableDiagnostics(authRequired);
  }

  // ── DTCs ────────────────────────────────────────────────────

  /** Report (or re-report) a Diagnostic Trouble Code. */
  reportDtc(code: number, severity: number): boolean {
    return this.native.reportDtc(code, severity);
  }

  /** Clear a single DTC by code. */
  clearDtc(code: number): boolean {
    return this.native.clearDtc(code);
  }

  /** Clear all DTCs. */
  clearAllDtcs(): void {
    this.native.clearAllDtcs();
  }

  /** Read all active DTCs. */
  getDtcs(): Dtc[] {
    return this.native.getDtcs();
  }

  // ── Address ─────────────────────────────────────────────────

  /** Override the local transport address (set automatically in constructor). */
  setLocalAddress(address: Address): void {
    this.native.setLocalAddress(address);
  }

  /** Get the local transport address. */
  getLocalAddress(): Address {
    return this.native.getLocalAddress();
  }
}

// ── Re-export constants ─────────────────────────────────────────

/** Protocol return codes. */
export const ReturnCode = bindings.ReturnCode as {
  readonly E_OK: 0x00;
  readonly E_NOT_OK: 0x01;
  readonly E_UNKNOWN_SERVICE: 0x02;
  readonly E_UNKNOWN_METHOD: 0x03;
  readonly E_NOT_READY: 0x04;
  readonly E_NOT_REACHABLE: 0x05;
  readonly E_TIMEOUT: 0x06;
  readonly E_MALFORMED_MESSAGE: 0x07;
  readonly E_AUTH_FAILED: 0x08;
  readonly E_DUPLICATE: 0x09;
};

/** DTC severity levels. */
export const DtcSeverity = bindings.DtcSeverity as {
  readonly Info: 0;
  readonly Warning: 1;
  readonly Error: 2;
  readonly Fatal: 3;
};

/** Diagnostic counter indices. */
export const DiagnosticCounter = bindings.DiagnosticCounter as {
  readonly CrcErrors: 0;
  readonly VersionMismatches: 1;
  readonly OversizedPayloads: 2;
  readonly TypeIdMismatches: 3;
  readonly DuplicateMessages: 4;
  readonly StaleMessages: 5;
  readonly AuthFailures: 6;
  readonly UnknownMessageTypes: 7;
  readonly DroppedMessages: 8;
};

/** Protocol message types. */
export const MessageType = bindings.MessageType as {
  readonly REQUEST: 0x00;
  readonly REQUEST_NO_RETURN: 0x01;
  readonly RESPONSE: 0x02;
  readonly NOTIFICATION: 0x03;
  readonly ERROR: 0x80;
};