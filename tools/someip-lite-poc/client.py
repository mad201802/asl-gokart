from someip.someiplite import SomeIpLite
from const import CLIENT_IP, SERVER_IP

client = SomeIpLite(bind_addr=CLIENT_IP)
client.start(thread=True)
print("Client started")

COUNTER = 0

def handle_response(response):
    print(f"Received method response message: method_id={response.method_id}, request_id={response.request_id}, response_code={response.response_code}, payload={response.payload}")

def handle_event(event):
    print(f"Received event trigger message: event_id={event.event_id}, payload={event.payload}")
    global COUNTER
    COUNTER += 1
    if COUNTER == 3:
        client.unsubscribe_event(SERVER_IP, 0x2)
        print("Unsubscribed from event")

# while True:
#     print(client.send_method_invoke(SERVER_IP, 0x1, b"Hello, world!", handle_response))
client.subscribe_event(SERVER_IP, 0x2, handle_event)