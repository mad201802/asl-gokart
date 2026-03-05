var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __moduleCache = /* @__PURE__ */ new WeakMap;
var __toCommonJS = (from) => {
  var entry = __moduleCache.get(from), desc;
  if (entry)
    return entry;
  entry = __defProp({}, "__esModule", { value: true });
  if (from && typeof from === "object" || typeof from === "function")
    __getOwnPropNames(from).map((key) => !__hasOwnProp.call(entry, key) && __defProp(entry, key, {
      get: () => from[key],
      enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
    }));
  __moduleCache.set(from, entry);
  return entry;
};
var __commonJS = (cb, mod) => () => (mod || cb((mod = { exports: {} }).exports, mod), mod.exports);
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, {
      get: all[name],
      enumerable: true,
      configurable: true,
      set: (newValue) => all[name] = () => newValue
    });
};

// build/Release/sero-node.node
var require_sero_node = __commonJS((exports2, module2) => {
  module2.exports = require("./sero-node-psrq0q7h.node");
});

// index.ts
var exports_sero_node = {};
__export(exports_sero_node, {
  SeroRuntime: () => SeroRuntime,
  ReturnCode: () => ReturnCode,
  MessageType: () => MessageType,
  DtcSeverity: () => DtcSeverity,
  DiagnosticCounter: () => DiagnosticCounter
});
module.exports = __toCommonJS(exports_sero_node);
var bindings = require_sero_node();

class SeroRuntime {
  native;
  constructor(options) {
    this.native = new bindings.SeroRuntime(options);
  }
  process(nowMs) {
    this.native.process(nowMs);
  }
  destroy() {
    this.native.destroy();
  }
  registerService(serviceId, handler, options) {
    return this.native.registerService(serviceId, handler, options);
  }
  unregisterService(serviceId) {
    return this.native.unregisterService(serviceId);
  }
  offerService(serviceId, ttlSeconds) {
    return this.native.offerService(serviceId, ttlSeconds);
  }
  stopOffer(serviceId) {
    this.native.stopOffer(serviceId);
  }
  registerEvent(serviceId, eventId) {
    return this.native.registerEvent(serviceId, eventId);
  }
  notifyEvent(serviceId, eventId, payload = Buffer.alloc(0)) {
    return this.native.notifyEvent(serviceId, eventId, payload);
  }
  findService(serviceId, majorVersion) {
    return this.native.findService(serviceId, majorVersion);
  }
  request(serviceId, methodId, payload = Buffer.alloc(0), timeoutMs) {
    return this.native.request(serviceId, methodId, payload, timeoutMs);
  }
  requestTo(address, serviceId, methodId, payload = Buffer.alloc(0), timeoutMs) {
    return this.native.requestTo(address, serviceId, methodId, payload, timeoutMs);
  }
  fireAndForget(serviceId, methodId, payload = Buffer.alloc(0)) {
    return this.native.fireAndForget(serviceId, methodId, payload);
  }
  subscribeEvent(serviceId, eventId, handler, ttlSeconds) {
    return this.native.subscribeEvent(serviceId, eventId, handler, ttlSeconds);
  }
  unsubscribeEvent(serviceId, eventId) {
    return this.native.unsubscribeEvent(serviceId, eventId);
  }
  onServiceFound(callback) {
    this.native.onServiceFound(callback);
  }
  onServiceLost(callback) {
    this.native.onServiceLost(callback);
  }
  onSubscriptionAck(callback) {
    this.native.onSubscriptionAck(callback);
  }
  setHmacKey(peer, key) {
    return this.native.setHmacKey(peer, key);
  }
  onDiagnostic(callback) {
    this.native.onDiagnostic(callback);
  }
  getDiagnostics() {
    return this.native.getDiagnostics();
  }
  enableDiagnostics(authRequired) {
    return this.native.enableDiagnostics(authRequired);
  }
  reportDtc(code, severity) {
    return this.native.reportDtc(code, severity);
  }
  clearDtc(code) {
    return this.native.clearDtc(code);
  }
  clearAllDtcs() {
    this.native.clearAllDtcs();
  }
  getDtcs() {
    return this.native.getDtcs();
  }
  setLocalAddress(address) {
    this.native.setLocalAddress(address);
  }
  getLocalAddress() {
    return this.native.getLocalAddress();
  }
}
var ReturnCode = bindings.ReturnCode;
var DtcSeverity = bindings.DtcSeverity;
var DiagnosticCounter = bindings.DiagnosticCounter;
var MessageType = bindings.MessageType;
