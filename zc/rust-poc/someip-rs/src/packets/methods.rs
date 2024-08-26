use serde::{Deserialize, Serialize};

#[derive(Deserialize, Serialize)]
pub struct SomeIpMethodInvoke {
    pub service_id: u8,
    pub method_id: u8,
    pub payload: Vec<u8>,
}

#[derive(Deserialize, Serialize)]
pub struct SomeIpMethodInvokeResponse {
    pub service_id: u8,
    pub method_id: u8,
    pub response_code: u8,
    pub payload: Vec<u8>,
}
