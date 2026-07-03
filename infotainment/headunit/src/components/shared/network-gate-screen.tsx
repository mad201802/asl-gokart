import React from "react";
import { Loader2, WifiOff } from "lucide-react";

export default function NetworkGateScreen() {
    // ponytail: Simple fullscreen screen gating app launch until network is ready
    return (
        <div className="flex flex-col items-center justify-center w-full h-full min-h-screen bg-slate-950 text-slate-50 p-6 selection:bg-slate-800">
            <div className="relative flex flex-col items-center space-y-6 max-w-md text-center">
                {/* Background glow effect */}
                <div className="absolute -inset-10 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
                
                <div className="relative flex items-center justify-center w-20 h-20 rounded-2xl bg-slate-900 border border-slate-800/80 shadow-2xl">
                    <WifiOff className="w-8 h-8 text-blue-400 animate-pulse" />
                    <Loader2 className="absolute w-16 h-16 text-blue-500/30 animate-spin" style={{ animationDuration: '3s' }} />
                </div>

                <div className="space-y-2 relative">
                    <h1 className="text-2xl font-bold tracking-tight bg-linear-to-b from-white to-slate-400 bg-clip-text text-transparent">
                        Waiting for Car Network
                    </h1>
                    <p className="text-sm text-slate-400 leading-relaxed">
                        Establishing connection to the vehicle interface. The infotainment system will start automatically once connected.
                    </p>
                </div>

                <div className="flex items-center space-x-2 text-xs text-blue-400/80 bg-blue-950/40 border border-blue-900/30 px-3 py-1.5 rounded-full relative">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Searching for interface MAC...</span>
                </div>
            </div>
        </div>
    );
}
