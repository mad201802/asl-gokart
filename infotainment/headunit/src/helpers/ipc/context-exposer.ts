import { exposeAppContext } from "./application/app-context";
import { exposeThemeContext } from "./theme/theme-context";
import { exposeWebSocketContext } from "./websocket/ws-context";
import { exposeWindowContext } from "./window/window-context";
import { exposeSeroContext } from "./sero/sero-context";
import { exposeHardwareContext } from "./hardware/hardware-context";

export default function exposeContexts() {
    exposeWindowContext();
    exposeThemeContext();
    exposeWebSocketContext();
    exposeAppContext();
    exposeSeroContext();
    exposeHardwareContext();
}
