// WebSocket server configuration
export const WEBSOCKET_PORT = process.env.WEBSOCKET_PORT ? parseInt(process.env.WEBSOCKET_PORT, 10) : 6969;

// SERO service configuration
export const SERO_UNICAST_PORT = 30491;
export const SERO_CLIENT_ID = 0x0002;
