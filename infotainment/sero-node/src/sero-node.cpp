/// @file sero-node.cpp
/// Node.js N-API wrapper for the sero C++17 header-only protocol library.
///
/// Embeds a POSIX UDP transport (unicast + multicast) and exposes the
/// sero::Runtime API as a JavaScript ObjectWrap class.
///
/// Usage from JS/TS:
///   const { SeroRuntime } = require('./build/Release/sero-node');
///   const rt = new SeroRuntime({ bindIp: '0.0.0.0', port: 30491, clientId: 0x7701 });
///   setInterval(() => rt.process(), 10);

#include <napi.h>
#include "sero.hpp"

#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <unistd.h>
#include <fcntl.h>
#include <cstring>
#include <cstdio>
#include <ctime>
#include <unordered_set>
#include <unordered_map>
#include <memory>
#include <string>

// ══════════════════════════════════════════════════════════════════
//  Monotonic clock
// ══════════════════════════════════════════════════════════════════

static uint32_t now_ms() {
    struct timespec ts;
    clock_gettime(CLOCK_MONOTONIC, &ts);
    return static_cast<uint32_t>(ts.tv_sec * 1000 + ts.tv_nsec / 1000000);
}

// ══════════════════════════════════════════════════════════════════
//  Configuration
// ══════════════════════════════════════════════════════════════════

// Desktop-oriented config (matches sero::DefaultConfig).
using Config = sero::DefaultConfig;
using Addr   = sero::Address<Config>;

// ══════════════════════════════════════════════════════════════════
//  Address helpers
// ══════════════════════════════════════════════════════════════════

/// 8-byte wire format: [IPv4 (4B)] [port big-endian (2B)] [padding (2B)]

static Addr make_addr(const char* ip, uint16_t port) {
    Addr a{};
    inet_pton(AF_INET, ip, a.data());
    a[4] = static_cast<uint8_t>(port >> 8);
    a[5] = static_cast<uint8_t>(port & 0xFF);
    return a;
}

static sockaddr_in addr_to_sockaddr(const Addr& a) {
    sockaddr_in sa{};
    sa.sin_family = AF_INET;
    std::memcpy(&sa.sin_addr, a.data(), 4);
    sa.sin_port = htons(static_cast<uint16_t>((a[4] << 8) | a[5]));
    return sa;
}

static Addr sockaddr_to_addr(const sockaddr_in& sa) {
    Addr a{};
    std::memcpy(a.data(), &sa.sin_addr, 4);
    uint16_t port = ntohs(sa.sin_port);
    a[4] = static_cast<uint8_t>(port >> 8);
    a[5] = static_cast<uint8_t>(port & 0xFF);
    return a;
}

/// Convert JS { ip: string, port: number } → 8-byte Addr.
static Addr js_to_addr(Napi::Env env, Napi::Value val) {
    auto obj = val.As<Napi::Object>();
    std::string ip = obj.Get("ip").As<Napi::String>().Utf8Value();
    uint16_t port = static_cast<uint16_t>(
        obj.Get("port").As<Napi::Number>().Uint32Value());
    return make_addr(ip.c_str(), port);
}

/// Convert 8-byte Addr → JS { ip: string, port: number }.
static Napi::Object addr_to_js(Napi::Env env, const Addr& a) {
    char ip_str[INET_ADDRSTRLEN];
    inet_ntop(AF_INET, a.data(), ip_str, sizeof(ip_str));
    uint16_t port = static_cast<uint16_t>((a[4] << 8) | a[5]);

    auto obj = Napi::Object::New(env);
    obj.Set("ip", Napi::String::New(env, ip_str));
    obj.Set("port", Napi::Number::New(env, port));
    return obj;
}

// ══════════════════════════════════════════════════════════════════
//  POSIX UDP Transport (desktop, based on sero/examples/udp_transport.hpp)
// ══════════════════════════════════════════════════════════════════

static constexpr const char* MCAST_GROUP = "239.0.0.1";
static constexpr uint16_t    MCAST_PORT  = 30490;

class NodeUdpTransport
    : public sero::ITransport<NodeUdpTransport, Config> {
public:
    static constexpr std::size_t MAX_BUF =
        sero::HEADER_SIZE + Config::MaxPayloadSize + sero::HMAC_SIZE + sero::CRC_SIZE;

    NodeUdpTransport() = default;
    ~NodeUdpTransport() { shutdown(); }

    bool init(const char* bind_ip, uint16_t bind_port) {
        // ── Unicast socket ──────────────────────────────────────
        unicast_fd_ = ::socket(AF_INET, SOCK_DGRAM, 0);
        if (unicast_fd_ < 0) return false;

        int reuse = 1;
        setsockopt(unicast_fd_, SOL_SOCKET, SO_REUSEADDR, &reuse, sizeof(reuse));
#ifdef SO_REUSEPORT
        setsockopt(unicast_fd_, SOL_SOCKET, SO_REUSEPORT, &reuse, sizeof(reuse));
#endif
        set_nonblocking(unicast_fd_);

        sockaddr_in uaddr{};
        uaddr.sin_family = AF_INET;
        uaddr.sin_port   = htons(bind_port);
        inet_pton(AF_INET, bind_ip, &uaddr.sin_addr);
        if (::bind(unicast_fd_, reinterpret_cast<sockaddr*>(&uaddr),
                   sizeof(uaddr)) < 0) {
            return false;
        }

        // ── Multicast socket ────────────────────────────────────
        mcast_fd_ = ::socket(AF_INET, SOCK_DGRAM, 0);
        if (mcast_fd_ < 0) return false;

        setsockopt(mcast_fd_, SOL_SOCKET, SO_REUSEADDR, &reuse, sizeof(reuse));
#ifdef SO_REUSEPORT
        setsockopt(mcast_fd_, SOL_SOCKET, SO_REUSEPORT, &reuse, sizeof(reuse));
#endif
        set_nonblocking(mcast_fd_);

        sockaddr_in maddr{};
        maddr.sin_family      = AF_INET;
        maddr.sin_port        = htons(MCAST_PORT);
        maddr.sin_addr.s_addr = htonl(INADDR_ANY);
        if (::bind(mcast_fd_, reinterpret_cast<sockaddr*>(&maddr),
                   sizeof(maddr)) < 0) {
            return false;
        }

        ip_mreq mreq{};
        inet_pton(AF_INET, MCAST_GROUP, &mreq.imr_multiaddr);
        inet_pton(AF_INET, bind_ip,     &mreq.imr_interface);
        if (setsockopt(mcast_fd_, IPPROTO_IP, IP_ADD_MEMBERSHIP,
                       &mreq, sizeof(mreq)) < 0) {
            return false;
        }

        in_addr mcast_if{};
        inet_pton(AF_INET, bind_ip, &mcast_if);
        setsockopt(unicast_fd_, IPPROTO_IP, IP_MULTICAST_IF,
                   &mcast_if, sizeof(mcast_if));

        uint8_t loop = 1;
        setsockopt(unicast_fd_, IPPROTO_IP, IP_MULTICAST_LOOP,
                   &loop, sizeof(loop));

        local_addr_ = make_addr(bind_ip, bind_port);
        return true;
    }

    void shutdown() {
        if (unicast_fd_ >= 0) { ::close(unicast_fd_); unicast_fd_ = -1; }
        if (mcast_fd_  >= 0) { ::close(mcast_fd_);  mcast_fd_  = -1; }
    }

    const Addr& local_addr() const { return local_addr_; }

    // ── CRTP implementation ─────────────────────────────────────

    bool impl_send(const Addr& dest, const uint8_t* data, std::size_t len) {
        sockaddr_in sa = addr_to_sockaddr(dest);
        ssize_t n = ::sendto(unicast_fd_, data, len, 0,
                             reinterpret_cast<sockaddr*>(&sa), sizeof(sa));
        return n == static_cast<ssize_t>(len);
    }

    bool impl_broadcast(const uint8_t* data, std::size_t len) {
        sockaddr_in sa{};
        sa.sin_family = AF_INET;
        sa.sin_port   = htons(MCAST_PORT);
        inet_pton(AF_INET, MCAST_GROUP, &sa.sin_addr);
        ssize_t n = ::sendto(unicast_fd_, data, len, 0,
                             reinterpret_cast<sockaddr*>(&sa), sizeof(sa));
        return n == static_cast<ssize_t>(len);
    }

    bool impl_poll(Addr& source, const uint8_t*& data, std::size_t& len) {
        if (try_recv(mcast_fd_,  source, data, len)) return true;
        if (try_recv(unicast_fd_, source, data, len)) return true;
        return false;
    }

private:
    int   unicast_fd_ = -1;
    int   mcast_fd_   = -1;
    Addr  local_addr_{};
    uint8_t recv_buf_[MAX_BUF]{};

    static void set_nonblocking(int fd) {
        int flags = fcntl(fd, F_GETFL, 0);
        fcntl(fd, F_SETFL, flags | O_NONBLOCK);
    }

    bool try_recv(int fd, Addr& source, const uint8_t*& data, std::size_t& len) {
        sockaddr_in from{};
        socklen_t fromlen = sizeof(from);
        ssize_t n = ::recvfrom(fd, recv_buf_, sizeof(recv_buf_), 0,
                               reinterpret_cast<sockaddr*>(&from), &fromlen);
        if (n <= 0) return false;
        source = sockaddr_to_addr(from);
        data   = recv_buf_;
        len    = static_cast<std::size_t>(n);
        return true;
    }
};

// ══════════════════════════════════════════════════════════════════
//  Type aliases for the concrete Runtime
// ══════════════════════════════════════════════════════════════════

using NodeRuntime = sero::Runtime<NodeUdpTransport, Config>;

// ══════════════════════════════════════════════════════════════════
//  JsService — wraps a JS callback into sero::IService<>
// ══════════════════════════════════════════════════════════════════

class JsService : public sero::IService<JsService> {
public:
    explicit JsService(Napi::Function on_request, Napi::Function is_ready)
        : on_request_cb_(Napi::Persistent(on_request))
    {
        on_request_cb_.SuppressDestruct();
        if (!is_ready.IsUndefined() && !is_ready.IsNull()) {
            is_ready_cb_ = Napi::Persistent(is_ready);
            is_ready_cb_.SuppressDestruct();
        }
    }

    ~JsService() = default;

    sero::ReturnCode impl_on_request(uint16_t method_id,
                                      const uint8_t* payload,
                                      std::size_t payload_length,
                                      uint8_t* response,
                                      std::size_t& response_length)
    {
        Napi::Env env = on_request_cb_.Env();
        Napi::HandleScope scope(env);

        auto js_payload = Napi::Buffer<uint8_t>::Copy(env, payload, payload_length);
        Napi::Value result = on_request_cb_.Call(
            {Napi::Number::New(env, method_id), js_payload});

        if (result.IsObject()) {
            auto obj = result.As<Napi::Object>();
            uint8_t rc = static_cast<uint8_t>(
                obj.Get("returnCode").As<Napi::Number>().Uint32Value());

            if (obj.Has("response") && !obj.Get("response").IsUndefined()
                && !obj.Get("response").IsNull())
            {
                auto resp_buf = obj.Get("response").As<Napi::Buffer<uint8_t>>();
                std::size_t len = resp_buf.Length();
                if (len > Config::MaxPayloadSize) len = Config::MaxPayloadSize;
                std::memcpy(response, resp_buf.Data(), len);
                response_length = len;
            } else {
                response_length = 0;
            }
            return static_cast<sero::ReturnCode>(rc);
        }

        response_length = 0;
        return sero::ReturnCode::E_NOT_OK;
    }

    bool impl_is_ready() const {
        if (is_ready_cb_.IsEmpty()) return true;
        Napi::Env env = is_ready_cb_.Env();
        Napi::HandleScope scope(env);
        Napi::Value val = is_ready_cb_.Call({});
        return val.ToBoolean().Value();
    }

private:
    Napi::FunctionReference on_request_cb_;
    Napi::FunctionReference is_ready_cb_;
};

// ══════════════════════════════════════════════════════════════════
//  JsEventHandler — wraps a JS callback into sero::IEventHandler<>
// ══════════════════════════════════════════════════════════════════

class JsEventHandler : public sero::IEventHandler<JsEventHandler> {
public:
    explicit JsEventHandler(Napi::Function callback)
        : callback_(Napi::Persistent(callback))
    {
        callback_.SuppressDestruct();
    }

    ~JsEventHandler() = default;

    void impl_on_event(uint16_t service_id, uint16_t event_id,
                       const uint8_t* payload, std::size_t payload_length)
    {
        Napi::Env env = callback_.Env();
        Napi::HandleScope scope(env);
        callback_.Call({
            Napi::Number::New(env, service_id),
            Napi::Number::New(env, event_id),
            Napi::Buffer<uint8_t>::Copy(env, payload, payload_length)
        });
    }

private:
    Napi::FunctionReference callback_;
};

// ══════════════════════════════════════════════════════════════════
//  PendingRequest — links a sero request to a JS Promise
// ══════════════════════════════════════════════════════════════════

class SeroRuntime;  // forward

struct PendingRequest {
    Napi::Promise::Deferred deferred;
    SeroRuntime* owner;

    PendingRequest(Napi::Env env, SeroRuntime* o)
        : deferred(Napi::Promise::Deferred::New(env)), owner(o) {}
};

// ══════════════════════════════════════════════════════════════════
//  Diagnostic counter name helper
// ══════════════════════════════════════════════════════════════════

static const char* diag_counter_name(sero::DiagnosticCounter c) {
    switch (c) {
        case sero::DiagnosticCounter::CrcErrors:           return "crcErrors";
        case sero::DiagnosticCounter::VersionMismatches:   return "versionMismatches";
        case sero::DiagnosticCounter::OversizedPayloads:   return "oversizedPayloads";
        case sero::DiagnosticCounter::TypeIdMismatches:    return "typeIdMismatches";
        case sero::DiagnosticCounter::DuplicateMessages:   return "duplicateMessages";
        case sero::DiagnosticCounter::StaleMessages:       return "staleMessages";
        case sero::DiagnosticCounter::AuthFailures:        return "authFailures";
        case sero::DiagnosticCounter::UnknownMessageTypes: return "unknownMessageTypes";
        case sero::DiagnosticCounter::DroppedMessages:     return "droppedMessages";
        default: return "unknown";
    }
}

// ══════════════════════════════════════════════════════════════════
//  SeroRuntime — main ObjectWrap binding
// ══════════════════════════════════════════════════════════════════

class SeroRuntime : public Napi::ObjectWrap<SeroRuntime> {
public:
    static Napi::Object Init(Napi::Env env, Napi::Object exports) {
        Napi::Function func = DefineClass(env, "SeroRuntime", {
            // Main loop
            InstanceMethod<&SeroRuntime::Process>("process"),
            InstanceMethod<&SeroRuntime::Destroy>("destroy"),

            // Provider — services
            InstanceMethod<&SeroRuntime::RegisterService>("registerService"),
            InstanceMethod<&SeroRuntime::UnregisterService>("unregisterService"),
            InstanceMethod<&SeroRuntime::OfferService>("offerService"),
            InstanceMethod<&SeroRuntime::StopOffer>("stopOffer"),

            // Provider — events
            InstanceMethod<&SeroRuntime::RegisterEvent>("registerEvent"),
            InstanceMethod<&SeroRuntime::NotifyEvent>("notifyEvent"),

            // Consumer — service discovery
            InstanceMethod<&SeroRuntime::FindService>("findService"),

            // Consumer — requests
            InstanceMethod<&SeroRuntime::Request>("request"),
            InstanceMethod<&SeroRuntime::RequestTo>("requestTo"),
            InstanceMethod<&SeroRuntime::FireAndForget>("fireAndForget"),

            // Consumer — event subscription
            InstanceMethod<&SeroRuntime::SubscribeEvent>("subscribeEvent"),
            InstanceMethod<&SeroRuntime::UnsubscribeEvent>("unsubscribeEvent"),

            // SD callbacks
            InstanceMethod<&SeroRuntime::OnServiceFound>("onServiceFound"),
            InstanceMethod<&SeroRuntime::OnServiceLost>("onServiceLost"),
            InstanceMethod<&SeroRuntime::OnSubscriptionAck>("onSubscriptionAck"),

            // Security
            InstanceMethod<&SeroRuntime::SetHmacKey>("setHmacKey"),

            // Diagnostics
            InstanceMethod<&SeroRuntime::OnDiagnostic>("onDiagnostic"),
            InstanceMethod<&SeroRuntime::GetDiagnostics>("getDiagnostics"),
            InstanceMethod<&SeroRuntime::EnableDiagnostics>("enableDiagnostics"),

            // DTCs
            InstanceMethod<&SeroRuntime::ReportDtc>("reportDtc"),
            InstanceMethod<&SeroRuntime::ClearDtc>("clearDtc"),
            InstanceMethod<&SeroRuntime::ClearAllDtcs>("clearAllDtcs"),
            InstanceMethod<&SeroRuntime::GetDtcs>("getDtcs"),

            // Address
            InstanceMethod<&SeroRuntime::SetLocalAddress>("setLocalAddress"),
            InstanceMethod<&SeroRuntime::GetLocalAddress>("getLocalAddress"),
        });

        // Export constants alongside the class

        // ReturnCode
        auto rc = Napi::Object::New(env);
        rc.Set("E_OK",                Napi::Number::New(env, 0x00));
        rc.Set("E_NOT_OK",            Napi::Number::New(env, 0x01));
        rc.Set("E_UNKNOWN_SERVICE",   Napi::Number::New(env, 0x02));
        rc.Set("E_UNKNOWN_METHOD",    Napi::Number::New(env, 0x03));
        rc.Set("E_NOT_READY",         Napi::Number::New(env, 0x04));
        rc.Set("E_NOT_REACHABLE",     Napi::Number::New(env, 0x05));
        rc.Set("E_TIMEOUT",           Napi::Number::New(env, 0x06));
        rc.Set("E_MALFORMED_MESSAGE", Napi::Number::New(env, 0x07));
        rc.Set("E_AUTH_FAILED",       Napi::Number::New(env, 0x08));
        rc.Set("E_DUPLICATE",         Napi::Number::New(env, 0x09));
        exports.Set("ReturnCode", rc);

        // DtcSeverity
        auto sev = Napi::Object::New(env);
        sev.Set("Info",    Napi::Number::New(env, 0));
        sev.Set("Warning", Napi::Number::New(env, 1));
        sev.Set("Error",   Napi::Number::New(env, 2));
        sev.Set("Fatal",   Napi::Number::New(env, 3));
        exports.Set("DtcSeverity", sev);

        // DiagnosticCounter
        auto dc = Napi::Object::New(env);
        dc.Set("CrcErrors",           Napi::Number::New(env, 0));
        dc.Set("VersionMismatches",   Napi::Number::New(env, 1));
        dc.Set("OversizedPayloads",   Napi::Number::New(env, 2));
        dc.Set("TypeIdMismatches",    Napi::Number::New(env, 3));
        dc.Set("DuplicateMessages",   Napi::Number::New(env, 4));
        dc.Set("StaleMessages",       Napi::Number::New(env, 5));
        dc.Set("AuthFailures",        Napi::Number::New(env, 6));
        dc.Set("UnknownMessageTypes", Napi::Number::New(env, 7));
        dc.Set("DroppedMessages",     Napi::Number::New(env, 8));
        exports.Set("DiagnosticCounter", dc);

        // MessageType
        auto mt = Napi::Object::New(env);
        mt.Set("REQUEST",           Napi::Number::New(env, 0x00));
        mt.Set("REQUEST_NO_RETURN", Napi::Number::New(env, 0x01));
        mt.Set("RESPONSE",          Napi::Number::New(env, 0x02));
        mt.Set("NOTIFICATION",      Napi::Number::New(env, 0x03));
        mt.Set("ERROR",             Napi::Number::New(env, 0x80));
        exports.Set("MessageType", mt);

        exports.Set("SeroRuntime", func);
        return exports;
    }

    // ── Constructor ─────────────────────────────────────────────

    SeroRuntime(const Napi::CallbackInfo& info)
        : Napi::ObjectWrap<SeroRuntime>(info)
    {
        Napi::Env env = info.Env();

        if (info.Length() < 1 || !info[0].IsObject()) {
            Napi::TypeError::New(env,
                "Expected options object: { bindIp?: string, port: number, clientId: number }")
                .ThrowAsJavaScriptException();
            return;
        }

        auto opts = info[0].As<Napi::Object>();

        std::string bind_ip = "0.0.0.0";
        if (opts.Has("bindIp") && !opts.Get("bindIp").IsUndefined()) {
            bind_ip = opts.Get("bindIp").As<Napi::String>().Utf8Value();
        }

        if (!opts.Has("port")) {
            Napi::TypeError::New(env, "Missing required option: port")
                .ThrowAsJavaScriptException();
            return;
        }
        uint16_t port = static_cast<uint16_t>(
            opts.Get("port").As<Napi::Number>().Uint32Value());

        if (!opts.Has("clientId")) {
            Napi::TypeError::New(env, "Missing required option: clientId")
                .ThrowAsJavaScriptException();
            return;
        }
        uint16_t client_id = static_cast<uint16_t>(
            opts.Get("clientId").As<Napi::Number>().Uint32Value());

        // Initialize transport
        if (!transport_.init(bind_ip.c_str(), port)) {
            Napi::Error::New(env,
                "Failed to initialise UDP transport on " + bind_ip + ":" +
                std::to_string(port))
                .ThrowAsJavaScriptException();
            return;
        }

        // Create runtime
        runtime_ = std::make_unique<NodeRuntime>(transport_, client_id);
        runtime_->set_local_address(transport_.local_addr());

        // Wire up SD callbacks pointing to our static trampolines
        auto& sd = runtime_->sd_callbacks();
        sd.on_service_found    = sd_on_service_found;
        sd.service_found_ctx   = this;
        sd.on_service_lost     = sd_on_service_lost;
        sd.service_lost_ctx    = this;
        sd.on_subscription_ack = sd_on_subscription_ack;
        sd.subscription_ack_ctx = this;

        // Wire up diagnostic callback
        runtime_->set_diagnostic_callback(diag_callback_trampoline, this);
    }

    ~SeroRuntime() {
        do_destroy();
    }

    // ── process(nowMs?) ─────────────────────────────────────────

    Napi::Value Process(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        ensure_alive(env);

        uint32_t now = now_ms();
        if (info.Length() > 0 && info[0].IsNumber()) {
            now = info[0].As<Napi::Number>().Uint32Value();
        }

        current_env_ = env;
        runtime_->process(now);
        current_env_ = nullptr;

        return env.Undefined();
    }

    // ── destroy() ───────────────────────────────────────────────

    Napi::Value Destroy(const Napi::CallbackInfo& info) {
        do_destroy();
        return info.Env().Undefined();
    }

    // ── registerService(serviceId, handler, options?) ───────────
    //    handler: { onRequest(methodId, payload) → { returnCode, response? }, isReady?() → bool }
    //    options: { majorVersion?, minorVersion?, authRequired? }

    Napi::Value RegisterService(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        ensure_alive(env);

        if (info.Length() < 2) {
            Napi::TypeError::New(env,
                "registerService(serviceId, handler, options?)")
                .ThrowAsJavaScriptException();
            return env.Undefined();
        }

        uint16_t service_id = static_cast<uint16_t>(
            info[0].As<Napi::Number>().Uint32Value());

        auto handler_obj = info[1].As<Napi::Object>();
        Napi::Function on_request_fn =
            handler_obj.Get("onRequest").As<Napi::Function>();
        Napi::Value is_ready_val = handler_obj.Get("isReady");
        Napi::Function is_ready_fn =
            is_ready_val.IsFunction() ? is_ready_val.As<Napi::Function>()
                                       : Napi::Function();

        uint8_t major = 1, minor = 0;
        bool auth_required = false;

        if (info.Length() > 2 && info[2].IsObject()) {
            auto opts = info[2].As<Napi::Object>();
            if (opts.Has("majorVersion"))
                major = static_cast<uint8_t>(
                    opts.Get("majorVersion").As<Napi::Number>().Uint32Value());
            if (opts.Has("minorVersion"))
                minor = static_cast<uint8_t>(
                    opts.Get("minorVersion").As<Napi::Number>().Uint32Value());
            if (opts.Has("authRequired"))
                auth_required = opts.Get("authRequired").As<Napi::Boolean>().Value();
        }

        // Allocate the JsService on the heap (must outlive the registration)
        auto svc = std::make_unique<JsService>(on_request_fn, is_ready_fn);
        bool ok = runtime_->register_service(service_id, *svc,
                                              major, minor, auth_required);
        if (ok) {
            services_[service_id] = std::move(svc);
        }
        return Napi::Boolean::New(env, ok);
    }

    // ── unregisterService(serviceId) ────────────────────────────

    Napi::Value UnregisterService(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        ensure_alive(env);

        uint16_t service_id = static_cast<uint16_t>(
            info[0].As<Napi::Number>().Uint32Value());
        bool ok = runtime_->unregister_service(service_id);
        services_.erase(service_id);
        return Napi::Boolean::New(env, ok);
    }

    // ── offerService(serviceId, ttlSeconds?) ────────────────────

    Napi::Value OfferService(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        ensure_alive(env);

        uint16_t service_id = static_cast<uint16_t>(
            info[0].As<Napi::Number>().Uint32Value());
        uint16_t ttl = Config::OfferTtlSeconds;
        if (info.Length() > 1 && info[1].IsNumber()) {
            ttl = static_cast<uint16_t>(
                info[1].As<Napi::Number>().Uint32Value());
        }
        return Napi::Boolean::New(env,
            runtime_->offer_service(service_id, ttl, now_ms()));
    }

    // ── stopOffer(serviceId) ────────────────────────────────────

    Napi::Value StopOffer(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        ensure_alive(env);

        uint16_t service_id = static_cast<uint16_t>(
            info[0].As<Napi::Number>().Uint32Value());
        runtime_->stop_offer(service_id);
        return env.Undefined();
    }

    // ── registerEvent(serviceId, eventId) ───────────────────────

    Napi::Value RegisterEvent(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        ensure_alive(env);

        uint16_t service_id = static_cast<uint16_t>(
            info[0].As<Napi::Number>().Uint32Value());
        uint16_t event_id = static_cast<uint16_t>(
            info[1].As<Napi::Number>().Uint32Value());
        return Napi::Boolean::New(env,
            runtime_->register_event(service_id, event_id));
    }

    // ── notifyEvent(serviceId, eventId, payload) ────────────────

    Napi::Value NotifyEvent(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        ensure_alive(env);

        uint16_t service_id = static_cast<uint16_t>(
            info[0].As<Napi::Number>().Uint32Value());
        uint16_t event_id = static_cast<uint16_t>(
            info[1].As<Napi::Number>().Uint32Value());

        const uint8_t* data = nullptr;
        std::size_t len = 0;
        if (info.Length() > 2 && info[2].IsBuffer()) {
            auto buf = info[2].As<Napi::Buffer<uint8_t>>();
            data = buf.Data();
            len  = buf.Length();
        }
        return Napi::Boolean::New(env,
            runtime_->notify_event(service_id, event_id, data, len, now_ms()));
    }

    // ── findService(serviceId, majorVersion?) ───────────────────

    Napi::Value FindService(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        ensure_alive(env);

        uint16_t service_id = static_cast<uint16_t>(
            info[0].As<Napi::Number>().Uint32Value());
        uint8_t major = 1;
        if (info.Length() > 1 && info[1].IsNumber()) {
            major = static_cast<uint8_t>(
                info[1].As<Napi::Number>().Uint32Value());
        }
        return Napi::Boolean::New(env,
            runtime_->find_service(service_id, major, now_ms()));
    }

    // ── request(serviceId, methodId, payload, timeoutMs?) → Promise

    Napi::Value Request(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        ensure_alive(env);

        uint16_t service_id = static_cast<uint16_t>(
            info[0].As<Napi::Number>().Uint32Value());
        uint16_t method_id = static_cast<uint16_t>(
            info[1].As<Napi::Number>().Uint32Value());

        const uint8_t* data = nullptr;
        std::size_t len = 0;
        if (info[2].IsBuffer()) {
            auto buf = info[2].As<Napi::Buffer<uint8_t>>();
            data = buf.Data();
            len  = buf.Length();
        }

        uint32_t timeout_ms = Config::RequestTimeoutMs;
        if (info.Length() > 3 && info[3].IsNumber()) {
            timeout_ms = info[3].As<Napi::Number>().Uint32Value();
        }

        auto* pending = new PendingRequest(env, this);
        pending_requests_.insert(pending);

        uint32_t now = now_ms();
        auto rid = runtime_->request(service_id, method_id,
                                      data, len,
                                      request_complete_cb, pending,
                                      timeout_ms, now);
        if (!rid) {
            pending_requests_.erase(pending);
            auto promise = pending->deferred.Promise();
            pending->deferred.Reject(
                Napi::Error::New(env, "Request failed (service not found or table full)")
                    .Value());
            delete pending;
            return promise;
        }
        return pending->deferred.Promise();
    }

    // ── requestTo(address, serviceId, methodId, payload, timeoutMs?) → Promise

    Napi::Value RequestTo(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        ensure_alive(env);

        Addr target = js_to_addr(env, info[0]);
        uint16_t service_id = static_cast<uint16_t>(
            info[1].As<Napi::Number>().Uint32Value());
        uint16_t method_id = static_cast<uint16_t>(
            info[2].As<Napi::Number>().Uint32Value());

        const uint8_t* data = nullptr;
        std::size_t len = 0;
        if (info[3].IsBuffer()) {
            auto buf = info[3].As<Napi::Buffer<uint8_t>>();
            data = buf.Data();
            len  = buf.Length();
        }

        uint32_t timeout_ms = Config::RequestTimeoutMs;
        if (info.Length() > 4 && info[4].IsNumber()) {
            timeout_ms = info[4].As<Napi::Number>().Uint32Value();
        }

        auto* pending = new PendingRequest(env, this);
        pending_requests_.insert(pending);

        uint32_t now = now_ms();
        auto rid = runtime_->request(target, service_id, method_id,
                                      data, len,
                                      request_complete_cb, pending,
                                      timeout_ms, now);
        if (!rid) {
            pending_requests_.erase(pending);
            auto promise = pending->deferred.Promise();
            pending->deferred.Reject(
                Napi::Error::New(env, "Request failed (table full)")
                    .Value());
            delete pending;
            return promise;
        }
        return pending->deferred.Promise();
    }

    // ── fireAndForget(serviceId, methodId, payload?) ────────────

    Napi::Value FireAndForget(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        ensure_alive(env);

        uint16_t service_id = static_cast<uint16_t>(
            info[0].As<Napi::Number>().Uint32Value());
        uint16_t method_id = static_cast<uint16_t>(
            info[1].As<Napi::Number>().Uint32Value());

        const uint8_t* data = nullptr;
        std::size_t len = 0;
        if (info.Length() > 2 && info[2].IsBuffer()) {
            auto buf = info[2].As<Napi::Buffer<uint8_t>>();
            data = buf.Data();
            len  = buf.Length();
        }

        return Napi::Boolean::New(env,
            runtime_->fire_and_forget(service_id, method_id, data, len));
    }

    // ── subscribeEvent(serviceId, eventId, handler, ttlSeconds?) ──

    Napi::Value SubscribeEvent(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        ensure_alive(env);

        uint16_t service_id = static_cast<uint16_t>(
            info[0].As<Napi::Number>().Uint32Value());
        uint16_t event_id = static_cast<uint16_t>(
            info[1].As<Napi::Number>().Uint32Value());
        Napi::Function handler = info[2].As<Napi::Function>();

        uint16_t ttl = Config::SubscriptionTtlSeconds;
        if (info.Length() > 3 && info[3].IsNumber()) {
            ttl = static_cast<uint16_t>(
                info[3].As<Napi::Number>().Uint32Value());
        }

        auto eh = std::make_unique<JsEventHandler>(handler);
        uint32_t key = event_handler_key(service_id, event_id);
        bool ok = runtime_->subscribe_event(service_id, event_id,
                                             *eh, ttl, now_ms());
        if (ok) {
            event_handlers_[key] = std::move(eh);
        }
        return Napi::Boolean::New(env, ok);
    }

    // ── unsubscribeEvent(serviceId, eventId) ────────────────────

    Napi::Value UnsubscribeEvent(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        ensure_alive(env);

        uint16_t service_id = static_cast<uint16_t>(
            info[0].As<Napi::Number>().Uint32Value());
        uint16_t event_id = static_cast<uint16_t>(
            info[1].As<Napi::Number>().Uint32Value());

        bool ok = runtime_->unsubscribe_event(service_id, event_id);
        event_handlers_.erase(event_handler_key(service_id, event_id));
        return Napi::Boolean::New(env, ok);
    }

    // ── SD callback setters ─────────────────────────────────────

    Napi::Value OnServiceFound(const Napi::CallbackInfo& info) {
        on_service_found_cb_ = Napi::Persistent(info[0].As<Napi::Function>());
        on_service_found_cb_.SuppressDestruct();
        return info.Env().Undefined();
    }

    Napi::Value OnServiceLost(const Napi::CallbackInfo& info) {
        on_service_lost_cb_ = Napi::Persistent(info[0].As<Napi::Function>());
        on_service_lost_cb_.SuppressDestruct();
        return info.Env().Undefined();
    }

    Napi::Value OnSubscriptionAck(const Napi::CallbackInfo& info) {
        on_subscription_ack_cb_ = Napi::Persistent(info[0].As<Napi::Function>());
        on_subscription_ack_cb_.SuppressDestruct();
        return info.Env().Undefined();
    }

    // ── Security ────────────────────────────────────────────────

    Napi::Value SetHmacKey(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        ensure_alive(env);

        Addr peer = js_to_addr(env, info[0]);
        auto key_buf = info[1].As<Napi::Buffer<uint8_t>>();

        if (key_buf.Length() < Config::HmacKeySize) {
            Napi::TypeError::New(env,
                "HMAC key must be at least " +
                std::to_string(Config::HmacKeySize) + " bytes")
                .ThrowAsJavaScriptException();
            return env.Undefined();
        }

        return Napi::Boolean::New(env,
            runtime_->set_hmac_key(peer, key_buf.Data()));
    }

    // ── Diagnostics ─────────────────────────────────────────────

    Napi::Value OnDiagnostic(const Napi::CallbackInfo& info) {
        on_diagnostic_cb_ = Napi::Persistent(info[0].As<Napi::Function>());
        on_diagnostic_cb_.SuppressDestruct();
        return info.Env().Undefined();
    }

    Napi::Value GetDiagnostics(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        ensure_alive(env);

        auto result = Napi::Object::New(env);
        const auto& d = runtime_->diagnostics();
        for (uint8_t i = 0;
             i < static_cast<uint8_t>(sero::DiagnosticCounter::_Count); ++i)
        {
            auto c = static_cast<sero::DiagnosticCounter>(i);
            result.Set(diag_counter_name(c),
                       Napi::Number::New(env, d.get(c)));
        }
        result.Set("pendingRequests",
                   Napi::Number::New(env,
                       static_cast<double>(runtime_->request_tracker().active_count())));
        return result;
    }

    Napi::Value EnableDiagnostics(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        ensure_alive(env);

        bool auth_required = false;
        if (info.Length() > 0 && info[0].IsBoolean()) {
            auth_required = info[0].As<Napi::Boolean>().Value();
        }
        return Napi::Boolean::New(env,
            runtime_->enable_diagnostics(now_ms(), auth_required));
    }

    // ── DTCs ────────────────────────────────────────────────────

    Napi::Value ReportDtc(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        ensure_alive(env);

        uint16_t code = static_cast<uint16_t>(
            info[0].As<Napi::Number>().Uint32Value());
        auto severity = static_cast<sero::DtcSeverity>(
            info[1].As<Napi::Number>().Uint32Value());
        return Napi::Boolean::New(env,
            runtime_->report_dtc(code, severity, now_ms()));
    }

    Napi::Value ClearDtc(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        ensure_alive(env);

        uint16_t code = static_cast<uint16_t>(
            info[0].As<Napi::Number>().Uint32Value());
        return Napi::Boolean::New(env, runtime_->clear_dtc(code));
    }

    Napi::Value ClearAllDtcs(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        ensure_alive(env);

        runtime_->clear_all_dtcs();
        return env.Undefined();
    }

    Napi::Value GetDtcs(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        ensure_alive(env);

        const auto& store = runtime_->dtc_store();
        auto arr = Napi::Array::New(env, store.count());
        uint32_t idx = 0;
        store.for_each([&](const sero::Dtc& dtc) {
            auto obj = Napi::Object::New(env);
            obj.Set("code", Napi::Number::New(env, dtc.code));
            obj.Set("severity", Napi::Number::New(env, dtc.severity));
            obj.Set("occurrenceCount",
                    Napi::Number::New(env, dtc.occurrence_count));
            obj.Set("firstSeenMs", Napi::Number::New(env, dtc.first_seen_ms));
            obj.Set("lastSeenMs", Napi::Number::New(env, dtc.last_seen_ms));
            arr.Set(idx++, obj);
        });
        return arr;
    }

    // ── Address ─────────────────────────────────────────────────

    Napi::Value SetLocalAddress(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        ensure_alive(env);

        Addr addr = js_to_addr(env, info[0]);
        runtime_->set_local_address(addr);
        return env.Undefined();
    }

    Napi::Value GetLocalAddress(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        return addr_to_js(env, transport_.local_addr());
    }

    // ── Helpers called from C callbacks during process() ────────

    void remove_pending(PendingRequest* p) {
        pending_requests_.erase(p);
    }

private:
    NodeUdpTransport transport_;
    std::unique_ptr<NodeRuntime> runtime_;

    // JS callback holders for services (provider)
    std::unordered_map<uint16_t, std::unique_ptr<JsService>> services_;

    // JS callback holders for event handlers (consumer)
    std::unordered_map<uint32_t, std::unique_ptr<JsEventHandler>> event_handlers_;

    // Pending request promises
    std::unordered_set<PendingRequest*> pending_requests_;

    // SD callback references
    Napi::FunctionReference on_service_found_cb_;
    Napi::FunctionReference on_service_lost_cb_;
    Napi::FunctionReference on_subscription_ack_cb_;

    // Diagnostic callback reference
    Napi::FunctionReference on_diagnostic_cb_;

    // Env valid only during process() — used by static C callback trampolines
    Napi::Env current_env_{nullptr};

    // ── Composite key for event handlers ────────────────────────

    static uint32_t event_handler_key(uint16_t sid, uint16_t eid) {
        return (static_cast<uint32_t>(sid) << 16) | eid;
    }

    // ── Liveness check ──────────────────────────────────────────

    void ensure_alive(Napi::Env env) {
        if (!runtime_) {
            Napi::Error::New(env, "SeroRuntime has been destroyed")
                .ThrowAsJavaScriptException();
        }
    }

    // ── Cleanup ─────────────────────────────────────────────────

    void do_destroy() {
        // Reject all pending request promises
        for (auto* pending : pending_requests_) {
            try {
                Napi::Env env = pending->deferred.Env();
                Napi::HandleScope scope(env);
                pending->deferred.Reject(
                    Napi::Error::New(env, "Runtime destroyed").Value());
            } catch (...) {
                // Ignore errors during teardown
            }
            delete pending;
        }
        pending_requests_.clear();

        // Release owned objects — must happen before runtime_ is destroyed
        // because the Runtime's ServiceEntry/EventHandlerEntry store raw
        // pointers into JsService/JsEventHandler instances.
        runtime_.reset();
        services_.clear();
        event_handlers_.clear();

        transport_.shutdown();
    }

    // ══════════════════════════════════════════════════════════════
    //  Static C callback trampolines
    //  These fire synchronously during runtime_->process(), which
    //  is always called from JavaScript → current_env_ is valid.
    // ══════════════════════════════════════════════════════════════

    // ── Request completion ──────────────────────────────────────

    static void request_complete_cb(sero::ReturnCode rc,
                                     const uint8_t* payload,
                                     std::size_t len,
                                     void* ctx)
    {
        auto* pending = static_cast<PendingRequest*>(ctx);
        pending->owner->remove_pending(pending);

        Napi::Env env = pending->deferred.Env();
        Napi::HandleScope scope(env);

        auto result = Napi::Object::New(env);
        result.Set("returnCode",
                   Napi::Number::New(env, static_cast<uint8_t>(rc)));

        if (payload && len > 0) {
            result.Set("payload",
                       Napi::Buffer<uint8_t>::Copy(env, payload, len));
        } else {
            result.Set("payload",
                       Napi::Buffer<uint8_t>::New(env, 0));
        }

        pending->deferred.Resolve(result);
        delete pending;
    }

    // ── SD: service found ───────────────────────────────────────

    static void sd_on_service_found(uint16_t sid, const Addr& addr, void* ctx) {
        auto* self = static_cast<SeroRuntime*>(ctx);
        if (self->on_service_found_cb_.IsEmpty()) return;

        Napi::Env env = self->current_env_;
        if (!env) return;
        Napi::HandleScope scope(env);

        self->on_service_found_cb_.Call({
            Napi::Number::New(env, sid),
            addr_to_js(env, addr)
        });
    }

    // ── SD: service lost ────────────────────────────────────────

    static void sd_on_service_lost(uint16_t sid, void* ctx) {
        auto* self = static_cast<SeroRuntime*>(ctx);
        if (self->on_service_lost_cb_.IsEmpty()) return;

        Napi::Env env = self->current_env_;
        if (!env) return;
        Napi::HandleScope scope(env);

        self->on_service_lost_cb_.Call({
            Napi::Number::New(env, sid)
        });
    }

    // ── SD: subscription ack ────────────────────────────────────

    static void sd_on_subscription_ack(uint16_t sid, uint16_t eid,
                                        sero::ReturnCode rc, uint16_t ttl,
                                        void* ctx)
    {
        auto* self = static_cast<SeroRuntime*>(ctx);
        if (self->on_subscription_ack_cb_.IsEmpty()) return;

        Napi::Env env = self->current_env_;
        if (!env) return;
        Napi::HandleScope scope(env);

        self->on_subscription_ack_cb_.Call({
            Napi::Number::New(env, sid),
            Napi::Number::New(env, eid),
            Napi::Number::New(env, static_cast<uint8_t>(rc)),
            Napi::Number::New(env, ttl)
        });
    }

    // ── Diagnostic callback ─────────────────────────────────────

    static void diag_callback_trampoline(sero::DiagnosticCounter counter,
                                          const uint8_t* header,
                                          void* ctx)
    {
        auto* self = static_cast<SeroRuntime*>(ctx);
        if (self->on_diagnostic_cb_.IsEmpty()) return;

        Napi::Env env = self->current_env_;
        if (!env) return;
        Napi::HandleScope scope(env);

        Napi::Value header_val;
        if (header) {
            header_val = Napi::Buffer<uint8_t>::Copy(env, header,
                                                      sero::HEADER_SIZE);
        } else {
            header_val = env.Null();
        }

        self->on_diagnostic_cb_.Call({
            Napi::String::New(env, diag_counter_name(counter)),
            header_val
        });
    }
};

// ══════════════════════════════════════════════════════════════════
//  Module registration
// ══════════════════════════════════════════════════════════════════

Napi::Object Init(Napi::Env env, Napi::Object exports) {
    return SeroRuntime::Init(env, exports);
}

NODE_API_MODULE(sero_node, Init)