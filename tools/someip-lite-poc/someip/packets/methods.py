class SomeIpLiteMethodInvokeMessage:
    def __init__(self, method_id: int, request_id: int, payload: bytes):
        self.method_id = method_id
        self.request_id = request_id
        self.payload = payload

    def __bytes__(self):
        method_id_bytes = self.method_id.to_bytes(4, byteorder='big')
        request_id_bytes = self.request_id.to_bytes(4, byteorder='big')
        return method_id_bytes + request_id_bytes + self.payload
    
    def parse(data: bytes):
        method_id = int.from_bytes(data[0:4], byteorder='big')
        request_id = int.from_bytes(data[4:8], byteorder='big')
        payload = data[8:]
        return SomeIpLiteMethodInvokeMessage(method_id, request_id, payload)
    
class SomeIpLiteMethodResponseMessage:
    def __init__(self, method_id: int, request_id: int, response_code: int, payload: bytes):
        self.method_id = method_id
        self.request_id = request_id
        self.response_code = response_code
        self.payload = payload

    def __bytes__(self):
        method_id_bytes = self.method_id.to_bytes(4, byteorder='big')
        request_id_bytes = self.request_id.to_bytes(4, byteorder='big')
        response_code_bytes = self.response_code.to_bytes(4, byteorder='big')
        return method_id_bytes + request_id_bytes + response_code_bytes + self.payload
    
    def parse(data: bytes):
        method_id = int.from_bytes(data[0:4], byteorder='big')
        request_id = int.from_bytes(data[4:8], byteorder='big')
        response_code = int.from_bytes(data[8:12], byteorder='big')
        payload = data[12:]
        return SomeIpLiteMethodResponseMessage(method_id, request_id, response_code, payload)