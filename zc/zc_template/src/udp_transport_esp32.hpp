#pragma once
/// @file udp_transport_esp32.hpp
/// WiFi/UDP transport for Sero on ESP32 (Arduino framework).
/// Address encoding (8 bytes): [IPv4 (4B)] [port BE (2B)] [padding (2B)]
/// Compatible with the desktop udp_transport.hpp wire format.

#include <sero.hpp>
#include <WiFi.h>
#include <WiFiUdp.h>
#include <ETH.h>

#include "config.hpp"

namespace esp32_app {

using Addr = sero::Address<Esp32Config>;

// ── Address helpers ─────────────────────────────────────────────

/// Build an 8-byte transport address from an IPAddress and port.
inline Addr make_addr(IPAddress ip, uint16_t port) {
    Addr a{};
    a[0] = ip[0];
    a[1] = ip[1];
    a[2] = ip[2];
    a[3] = ip[3];
    a[4] = static_cast<uint8_t>(port >> 8);
    a[5] = static_cast<uint8_t>(port & 0xFF);
    return a;
}

/// Extract IP and port from an 8-byte transport address.
inline void addr_to_ip_port(const Addr& a, IPAddress& ip, uint16_t& port) {
    ip = IPAddress(a[0], a[1], a[2], a[3]);
    port = static_cast<uint16_t>((a[4] << 8) | a[5]);
}

/// Format address as a printable string.
inline String addr_to_string(const Addr& a) {
    char buf[24];
    snprintf(buf, sizeof(buf), "%u.%u.%u.%u:%u",
             a[0], a[1], a[2], a[3],
             unsigned((a[4] << 8) | a[5]));
    return String(buf);
}

// ── Constants ───────────────────────────────────────────────────

static constexpr const char* MCAST_GROUP = "239.0.0.1";
static constexpr uint16_t    MCAST_PORT  = 30490;

// ── ESP32 UDP Transport ─────────────────────────────────────────

class UdpTransportEsp32
    : public sero::ITransport<UdpTransportEsp32, Esp32Config> {
public:
    static constexpr size_t MAX_BUF = sero::HEADER_SIZE +
        Esp32Config::MaxPayloadSize + sero::HMAC_SIZE + sero::CRC_SIZE;

    UdpTransportEsp32() = default;

    /// Initialize transport: bind unicast port, join multicast group.
    /// Call after WiFi.status() == WL_CONNECTED.
    bool init(uint16_t local_port) {
        local_port_ = local_port;

        // Unicast socket
        if (!unicast_.begin(local_port)) {
            Serial.println("[transport] Failed to bind unicast port");
            return false;
        }

        // Multicast socket — join group on WiFi interface
        IPAddress mcast;
        mcast.fromString(MCAST_GROUP);
        if (!mcast_udp_.beginMulticast(mcast, MCAST_PORT)) {
            Serial.println("[transport] Failed to join multicast group");
            return false;
        }

        local_addr_ = make_addr(ETH.localIP(), local_port);

        Serial.printf("[transport] Listening on %s (unicast) + %s:%u (multicast)\n",
                      addr_to_string(local_addr_).c_str(),
                      MCAST_GROUP, MCAST_PORT);
        return true;
    }

    Addr local_addr() const { return local_addr_; }

    // ── CRTP implementation ─────────────────────────────────────

    bool impl_send(const Addr& dest, const uint8_t* data, size_t len) {
        IPAddress ip;
        uint16_t port;
        addr_to_ip_port(dest, ip, port);
        unicast_.beginPacket(ip, port);
        unicast_.write(data, len);
        return unicast_.endPacket() != 0;
    }

    bool impl_broadcast(const uint8_t* data, size_t len) {
        IPAddress mcast;
        mcast.fromString(MCAST_GROUP);
        unicast_.beginPacket(mcast, MCAST_PORT);
        unicast_.write(data, len);
        return unicast_.endPacket() != 0;
    }

    bool impl_poll(Addr& source, const uint8_t*& data, size_t& len) {
        // Try multicast first, then unicast
        if (try_recv(mcast_udp_, source, data, len)) return true;
        if (try_recv(unicast_,   source, data, len)) return true;
        return false;
    }

private:
    WiFiUDP  unicast_;
    WiFiUDP  mcast_udp_;
    uint16_t local_port_ = 0;
    Addr     local_addr_{};
    uint8_t  recv_buf_[MAX_BUF]{};

    bool try_recv(WiFiUDP& udp, Addr& source, const uint8_t*& data, size_t& len) {
        int pkt_size = udp.parsePacket();
        if (pkt_size <= 0) return false;

        size_t to_read = static_cast<size_t>(pkt_size);
        if (to_read > sizeof(recv_buf_)) to_read = sizeof(recv_buf_);

        int n = udp.read(recv_buf_, to_read);
        if (n <= 0) return false;

        source = make_addr(udp.remoteIP(), udp.remotePort());
        data   = recv_buf_;
        len    = static_cast<size_t>(n);
        return true;
    }
};

} // namespace esp32_app
