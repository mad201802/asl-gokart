from someip.someiplite import SomeIpLite
from time import sleep
from const import SERVER_IP

def handle_request(request):
    print(f"Received method invoke message: method_id={request.method_id}, request_id={request.request_id}, payload={request.payload}")
    return (0, b"Hello, Tom!")

server = SomeIpLite(bind_addr=SERVER_IP)
server.offer_method(0x1, handle_request)
server.offer_event(0x2)
server.start(thread=True)

while True:
    server.trigger_event(0x2, b"Hello, world!")
    print("Triggered event")
    sleep(5)