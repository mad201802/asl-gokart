class SomeIpLiteEventSubscribeMessage:
    def __init__(self, event_id: int):
        self.event_id = event_id

    def __bytes__(self):
        event_id_bytes = self.event_id.to_bytes(4, byteorder='big')
        return event_id_bytes
    
    def parse(data: bytes):
        event_id = int.from_bytes(data[0:4], byteorder='big')
        return SomeIpLiteEventSubscribeMessage(event_id)
    
class SomeIpLiteEventSubscribeAckMessage:
    def __init__(self, event_id: int):
        self.event_id = event_id

    def __bytes__(self):
        event_id_bytes = self.event_id.to_bytes(4, byteorder='big')
        return event_id_bytes
    
    def parse(data: bytes):
        event_id = int.from_bytes(data[0:4], byteorder='big')
        return SomeIpLiteEventSubscribeAckMessage(event_id)
    
class SomeIpLiteEventTriggerMessage:
    def __init__(self, event_id: int, payload: bytes):
        self.event_id = event_id
        self.payload = payload

    def __bytes__(self):
        event_id_bytes = self.event_id.to_bytes(4, byteorder='big')
        return event_id_bytes + self.payload
    
    def parse(data: bytes):
        event_id = int.from_bytes(data[0:4], byteorder='big')
        payload = data[4:]
        return SomeIpLiteEventTriggerMessage(event_id, payload)
    
class SomeIpLiteEventUnsubscribeMessage:
    def __init__(self, event_id: int):
        self.event_id = event_id

    def __bytes__(self):
        event_id_bytes = self.event_id.to_bytes(4, byteorder='big')
        return event_id_bytes
    
    def parse(data: bytes):
        event_id = int.from_bytes(data[0:4], byteorder='big')
        return SomeIpLiteEventUnsubscribeMessage(event_id)
    
class SomeIpLiteEventUnsubscribeAckMessage:
    def __init__(self, event_id: int):
        self.event_id = event_id

    def __bytes__(self):
        event_id_bytes = self.event_id.to_bytes(4, byteorder='big')
        return event_id_bytes
    
    def parse(data: bytes):
        event_id = int.from_bytes(data[0:4], byteorder='big')
        return SomeIpLiteEventUnsubscribeAckMessage(event_id)