import type { ForgeConfig } from "@electron-forge/shared-types";
import { MakerDeb } from "@electron-forge/maker-deb";
import { VitePlugin } from "@electron-forge/plugin-vite";
import { FusesPlugin } from "@electron-forge/plugin-fuses";
import { FuseV1Options, FuseVersion } from "@electron/fuses";

// Modules used by the main/preload processes at runtime that Vite
// externalises (i.e. leaves as bare `require()` calls).  These must
// survive electron-packager's file-copy filter so they end up inside
// the asar archive alongside the `.vite/` build output.
const runtimeDeps = [
    "@asl-gokart/sero-node",
    "electron-log",
    "electron-squirrel-startup",
    "faye-websocket",
];

// Build a set of top-level directories that should be kept.
// For scoped packages like @asl-gokart/sero-node the relevant
// directory is "node_modules/@asl-gokart".
const keepDirs = new Set<string>();
for (const dep of runtimeDeps) {
    const scope = dep.startsWith("@") ? dep.split("/")[0] : dep;
    keepDirs.add(scope);
}

const config: ForgeConfig = {
    packagerConfig: {
        asar: {
            unpack: "**/*.node",
        },
        // Override the Vite plugin's default ignore (which strips everything
        // except .vite/).  We keep .vite/ *and* the node_modules trees that
        // the main process needs at runtime.
        ignore: (file: string) => {
            if (!file) return false;
            if (file.startsWith("/.vite")) return false;
            if (file === "/package.json") return false;
            if (file === "/node_modules") return false;

            // Allow the specific runtime dependency directories through
            for (const dir of keepDirs) {
                if (file.startsWith(`/node_modules/${dir}`)) return false;
            }

            // Everything else is ignored (source, devDeps, etc.)
            return true;
        },
    },
    rebuildConfig: {},
    makers: [
        new MakerDeb({}),
    ],
    plugins: [
        new VitePlugin({
            // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
            // If you are familiar with Vite configuration, it will look really familiar.
            build: [
                {
                    // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
                    entry: "src/main.ts",
                    config: "vite.main.config.ts",
                },
                {
                    entry: "src/preload.ts",
                    config: "vite.preload.config.ts",
                },
            ],
            renderer: [
                {
                    name: "main_window",
                    config: "vite.renderer.config.ts",
                },
            ],
        }),
        // Fuses are used to enable/disable various Electron functionality
        // at package time, before code signing the application
        new FusesPlugin({
            version: FuseVersion.V1,
            [FuseV1Options.RunAsNode]: false,
            [FuseV1Options.EnableCookieEncryption]: true,
            [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
            [FuseV1Options.EnableNodeCliInspectArguments]: false,
            [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
            [FuseV1Options.OnlyLoadAppFromAsar]: true,
        }),
    ],
};

export default config;
