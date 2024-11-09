import { exposeAppContext } from "./application/app-context";
import { exposeThemeContext } from "./theme/theme-context";
import { exposeWebSocketContext } from "./websocket/ws-context";
import { exposeWindowContext } from "./window/window-context";

export default function exposeContexts() {
    exposeWindowContext();
    exposeThemeContext();
    exposeWebSocketContext();
    exposeAppContext();
}
