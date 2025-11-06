# `@asl-gokart/someip-node`

This package is based on `@napi-rs/package-template` [GitHub](https://github.com/napi-rs/package-template).


## Usage

1. Run `yarn install` to install dependencies.

## Install this package in your project

### Configure custom registry in your package manager

#### npm

Create or edit the `.npmrc` file in your project :

```bash
registry=https://registry.npmjs.org/
@asl-gokart:registry=https://registry.leotm.de/
```

#### yarn and others

Please check the docs of your package manager to set a custom registry for the `@asl-gokart` scope.

### Install the package

```bash
npm install @asl-gokart/someip-node
```

## Ability

### Build

After `yarn build` command, you can see `package-template.[darwin|win32|linux].node` file in project root. This is the native addon built from [lib.rs](./src/lib.rs).

### Test

With [ava](https://github.com/avajs/ava), run `yarn test/npm run test` to testing native addon. You can also switch to another testing framework if you want.

### CI

With GitHub Actions, each commit and pull request will be built and tested automatically in [`node@20`, `@node22`] x [`macOS`, `Linux`, `Windows`] matrix. You will never be afraid of the native addon broken in these platforms.

### Release

Release native package is very difficult in old days. Native packages may ask developers who use it to install `build toolchain` like `gcc/llvm`, `node-gyp` or something more.

With `GitHub actions`, we can easily prebuild a `binary` for major platforms. And with `N-API`, we should never be afraid of **ABI Compatible**.

The other problem is how to deliver prebuild `binary` to users. Downloading it in `postinstall` script is a common way that most packages do it right now. The problem with this solution is it introduced many other packages to download binary that has not been used by `runtime codes`. The other problem is some users may not easily download the binary from `GitHub/CDN` if they are behind a private network (But in most cases, they have a private NPM mirror).

In this package, we choose a better way to solve this problem. We release different `npm packages` for different platforms. And add it to `optionalDependencies` before releasing the `Major` package to npm.

`NPM` will choose which native package should download from `registry` automatically. You can see [npm](./npm) dir for details. And you can also run `yarn add @napi-rs/package-template` to see how it works.

**IMPORTANT:** For `@asl-gokart/someip-node` package, we only release `linux-x64` and `linux-arm64` packages in `npm` registry. If you want to use it in other platforms, you have to add these to the CI/CD workflow and release them by yourself.
> **DO NOT** publish manually, only through the CI/CD workflow!

## Develop requirements

- Install the latest `Rust`
- Install `Node.js@10+` which fully supported `Node-API`
- Install `yarn@1.x`

## Test in local

- yarn
- yarn build
- yarn test

And you will see:

```bash
$ ava --verbose

  ✔ sync function from native code
  ✔ sleep function from native code (201ms)
  ─

  2 tests passed
✨  Done in 1.12s.
```

## Release package via CLI (DO NOT DO THIS!)

Make sure you set these two environment variables before releasing package via CLI.

```bash
export NPM_REGISTRY_AUTH_TOKEN=your_token
```

Then run:

```bash
yarn npm publish
```

## Release package via CI/CD

Ensure you have set your **NPM_TOKEN** as a secret in the `GitHub` project settings.

In `Settings -> Secrets`, add **NPM_TOKEN** into it.

When you want to release the package:

```bash
yarn version [<newversion> | major | minor | patch | premajor | preminor | prepatch | prerelease [--preid=<prerelease-id>] | from-git]

git push
```

GitHub actions will do the rest job for you.

> WARN: Don't run `(yarn) npm publish` manually.
