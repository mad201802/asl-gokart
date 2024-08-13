mod packets;
mod service;

use service::SomeIpService;

fn main() {
    let mut service = service::SomeIpService::new(0x01);
    service.offer_method(0x01, |payload| {
        println!("Received payload: {:?}", payload);
        vec![0x01, 0x02, 0x03]
    });

    service.offer_method(0x02, |payload| {
        println!("Received payload: {:?}", payload);
        vec![0x04, 0x05, 0x06]
    });

    service.run();
}
