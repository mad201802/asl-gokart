from someip.packets.methods import SomeIpLiteMethodInvokeMessage, SomeIpLiteMethodResponseMessage
from someip.packets.base import SomeIpLitePacket, SomeIpLitePacketType
from someip.packets.events import SomeIpLiteEventSubscribeAckMessage, SomeIpLiteEventSubscribeMessage, SomeIpLiteEventTriggerMessage, SomeIpLiteEventUnsubscribeAckMessage, SomeIpLiteEventUnsubscribeMessage
import socket
import random
import threading
import time

class SomeIpLite():
    def __init__(self, bind_addr: str = "0.0.0.0", port: int = 42069):
        self.bind_addr = bind_addr
        self.port = port

        # Save offered methods with their method id and request handler
        self.offered_methods = {}
        self.open_responses = {}

        # Save offered events with their event id and subscriber ips
        self.event_subscribers = {}
        self.unacknowledged_event_subscriptions = {}
        self.subscribed_events = {}
        self.unacknowledged_event_unsubscriptions = {}

    def send_method_invoke(self, remote_ip: str, method_id: int, payload: bytes, response_handler):
        print(f"Sending method invoke message: method_id={method_id}, payload={payload}")
        request_id = self.__generate_request_id()
        method_invoke = SomeIpLiteMethodInvokeMessage(method_id, request_id, payload)
        method_invoke_bytes = bytes(method_invoke)

        packet = SomeIpLitePacket(SomeIpLitePacketType.METHOD_INVOKE.value, method_invoke_bytes)
        packet_bytes = bytes(packet)

        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            bytes_send = s.sendto(packet_bytes, (remote_ip, self.port))
            if bytes_send == len(packet_bytes):
                self.open_responses[request_id] = response_handler
                return True
            else:
                return False
        
    def offer_method(self, method_id: int, request_handler):
        self.offered_methods[method_id] = request_handler

    def offer_event(self, event_id: int):
        '''
        Offer an event with the given event id. This will allow clients to subscribe to this event.
        '''
        self.event_subscribers[event_id] = []

    def subscribe_event(self, remote_ip: str, event_id: int, trigger_callback):
        '''
        Subscribe to an event with the given event id. When the event is triggered, the trigger_callback will be called.
        '''
        event_subscribe = SomeIpLiteEventSubscribeMessage(event_id)
        event_subscribe_bytes = bytes(event_subscribe)
        packet = SomeIpLitePacket(SomeIpLitePacketType.EVENT_SUBSCRIBE.value, event_subscribe_bytes)
        packet_bytes = bytes(packet)

        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            print(f"Sending event subscribe message: event_id={event_id}")
            s.sendto(packet_bytes, (remote_ip, self.port))
            self.unacknowledged_event_subscriptions[event_id] = trigger_callback

    def unsubscribe_event(self, remote_ip: str, event_id: int):
        '''
        Unsubscribe from an event with the given event id.
        '''
        event_unsubscribe = SomeIpLiteEventUnsubscribeMessage(event_id)
        event_unsubscribe_bytes = bytes(event_unsubscribe)
        packet = SomeIpLitePacket(SomeIpLitePacketType.EVENT_UNSUBSCRIBE.value, event_unsubscribe_bytes)
        packet_bytes = bytes(packet)

        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            print(f"Sending event unsubscribe message: event_id={event_id}")
            s.sendto(packet_bytes, (remote_ip, self.port))
            self.unacknowledged_event_unsubscriptions[event_id] = remote_ip

    def trigger_event(self, event_id: int, payload: bytes):
        event_trigger = SomeIpLiteEventTriggerMessage(event_id, payload)
        event_trigger_bytes = bytes(event_trigger)
        packet = SomeIpLitePacket(SomeIpLitePacketType.EVENT_TRIGGER.value, event_trigger_bytes)
        packet_bytes = bytes(packet)

        for subscriber_ip in self.event_subscribers[event_id]:
            with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
                print(f"Sending event trigger message: event_id={event_id}, payload={payload}")
                s.sendto(packet_bytes, (subscriber_ip, self.port))

    def handle_packet(self, remote_ip: str, packet: SomeIpLitePacket):
        if packet.packet_type == SomeIpLitePacketType.METHOD_INVOKE.value:
            method_invoke = SomeIpLiteMethodInvokeMessage.parse(packet.payload)
            if method_invoke.method_id in self.offered_methods:
                response = self.offered_methods[method_invoke.method_id](method_invoke)
                if response is not None:
                    method_response = SomeIpLiteMethodResponseMessage(method_invoke.method_id, method_invoke.request_id, response[0], response[1])
                    method_response_bytes = bytes(method_response)

                    packet = SomeIpLitePacket(SomeIpLitePacketType.METHOD_RESPONSE.value, method_response_bytes)
                    packet_bytes = bytes(packet)

                    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
                        print(f"Sending method response message {remote_ip}: method_id={method_response.method_id}, request_id={method_response.request_id}, response_code={method_response.response_code}, payload={method_response.payload}")
                        s.sendto(packet_bytes, (remote_ip, self.port))
        
        
        elif packet.packet_type == SomeIpLitePacketType.METHOD_RESPONSE.value:
            method_response = SomeIpLiteMethodResponseMessage.parse(packet.payload)
            if method_response.request_id in self.open_responses:
                self.open_responses[method_response.request_id](method_response)
                del self.open_responses[method_response.request_id]

        elif packet.packet_type == SomeIpLitePacketType.EVENT_SUBSCRIBE.value:
            event_subscribe = SomeIpLiteEventSubscribeMessage.parse(packet.payload)
            if event_subscribe.event_id in self.event_subscribers:
                self.event_subscribers[event_subscribe.event_id].append(remote_ip)

                event_subscribe_ack = SomeIpLiteEventSubscribeAckMessage(event_subscribe.event_id)
                event_subscribe_ack_bytes = bytes(event_subscribe_ack)
                packet = SomeIpLitePacket(SomeIpLitePacketType.EVENT_SUBSCRIBE_ACK.value, event_subscribe_ack_bytes)
                packet_bytes = bytes(packet)

                with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
                    print(f"Sending event subscribe ack message: event_id={event_subscribe_ack.event_id}")
                    s.sendto(packet_bytes, (remote_ip, self.port))

        elif packet.packet_type == SomeIpLitePacketType.EVENT_SUBSCRIBE_ACK.value:
            event_subscribe_ack = SomeIpLiteEventSubscribeAckMessage.parse(packet.payload)
            if event_subscribe_ack.event_id in self.unacknowledged_event_subscriptions:
                self.subscribed_events[event_subscribe_ack.event_id] = self.unacknowledged_event_subscriptions[event_subscribe_ack.event_id]
                del self.unacknowledged_event_subscriptions[event_subscribe_ack.event_id]


        elif packet.packet_type == SomeIpLitePacketType.EVENT_TRIGGER.value:
            event_trigger = SomeIpLiteEventTriggerMessage.parse(packet.payload)
            if event_trigger.event_id in self.subscribed_events:
                self.subscribed_events[event_trigger.event_id](event_trigger)

        elif packet.packet_type == SomeIpLitePacketType.EVENT_UNSUBSCRIBE.value:
            event_unsubscribe = SomeIpLiteEventUnsubscribeMessage.parse(packet.payload)
            if event_unsubscribe.event_id in self.event_subscribers:
                self.event_subscribers[event_unsubscribe.event_id].remove(remote_ip)

                event_unsubscribe_ack = SomeIpLiteEventUnsubscribeAckMessage(event_unsubscribe.event_id)
                event_unsubscribe_ack_bytes = bytes(event_unsubscribe_ack)
                packet = SomeIpLitePacket(SomeIpLitePacketType.EVENT_UNSUBSCRIBE_ACK.value, event_unsubscribe_ack_bytes)
                packet_bytes = bytes(packet)

                with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
                    print(f"Sending event unsubscribe ack message: event_id={event_unsubscribe_ack.event_id}")
                    s.sendto(packet_bytes, (remote_ip, self.port))

        elif packet.packet_type == SomeIpLitePacketType.EVENT_UNSUBSCRIBE_ACK.value:
            event_unsubscribe_ack = SomeIpLiteEventUnsubscribeAckMessage.parse(packet.payload)
            if event_unsubscribe_ack.event_id in self.unacknowledged_event_unsubscriptions:
                del self.unacknowledged_event_unsubscriptions[event_unsubscribe_ack.event_id]
                del self.subscribed_events[event_unsubscribe_ack.event_id]

    def start(self, thread=False):
        if thread:
            threading.Thread(target=self.__start).start()
            time.sleep(2)
        else:
            self.__start()

    def __start(self):
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.bind((self.bind_addr, self.port))
            print("Server started")
            while True:
                data, addr = s.recvfrom(1024)
                print(f"Received packet from {addr[0]}")
                packet = SomeIpLitePacket.parse(data)
                self.handle_packet(addr[0], packet)

    def __generate_request_id(self) -> int:
        # Generate random request id between 0 and 2^32
        return random.randint(0, 2**32 - 1)