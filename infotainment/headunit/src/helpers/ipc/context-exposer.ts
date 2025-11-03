import { exposeAppContext } from "./application/app-context";
import { exposeThemeContext } from "./theme/theme-context";
import { exposeSomeipContext } from "./someip/someip-context";
import { exposeWebSocketContext } from "./websocket/ws-context";
import { exposeWindowContext } from "./window/window-context";

export default function exposeContexts() {
    exposeWindowContext();
    exposeThemeContext();
    exposeWebSocketContext();
    exposeSomeipContext();
    exposeAppContext();
}
