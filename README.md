<p align="center">
    <img src="resources/img/logo.png">
</p>
<div align="center">
  <h1 align="center">Protostar Test Explorer</h1>
  <p align="center">
    <a href="https://discord.gg/onlydust">
        <img src="https://img.shields.io/badge/Discord-6666FF?style=for-the-badge&logo=discord&logoColor=white">
    </a>
    <a href="https://twitter.com/intent/follow?screen_name=onlydust_xyz">
        <img src="https://img.shields.io/badge/Twitter-1DA1F2?style=for-the-badge&logo=twitter&logoColor=white">
    </a>
    <a href="https://contributions.onlydust.xyz/">
        <img src="https://img.shields.io/badge/Contribute-6A1B9A?style=for-the-badge&logo=notion&logoColor=white">
    </a>
  </p>
  
  <h3 align="center">vscode extension to view protostar tests in the Test Explorer.</h3>
</div>

> ## ⚠️ WARNING! ⚠️
>
> This repo contains highly experimental code.
> Expect rapid iteration.

## 🎟️ Description

vscode extension to view protostar tests in the Test Explorer.

This extension uses vscode native TEst API

## 🎗️ Prerequisites

Install [`yarn`](https://classic.yarnpkg.com/lang/en/docs/install/#debian-stable) package manager.

This extension assume that all tests of a workspace can be run with the `protostar test` command without arguments.
You might need to configure your `protostar.toml` configuration file to do so.
For instance:
```
["protostar.shared_command_configs"]
cairo_path = ["./lib/cairo_contracts/src"]
target = "contracts"
```

Also, you need to create a "CI" profile that removes colors from `protostar` output for this extension to work properly.
Add the following section in the `protostar.toml` file:
```
[profile.ci.protostar.shared_command_configs]
no_color=true
```

## 📦 Installation

Launch VS Code Quick Open (`Ctrl+P`), paste the following command, and press `enter`.
```
ext install abuisset.vscode-protostar-test-adapter
```

## 🔬 Usage

Click on the ![Test](./img/test-explorer-icon.png), you should see the list of protostar tests.

![test view](img/tests-view.png)

Then interact with your tests as any other Test adapter.
More information here.

## 🌡️ Testing

Unit tests are using `jest` framework.
In order to run the tests, simply run the following command:
```
yarn test
```

To check code coverage, run:
```
yarn coverage
```

To check code formatting, run:
```
yarn lint
```

You can also format your code by using the following command:
```
yarn lint:fix
```

## 🫶 Contributing

Contribution guidelines are specified in [CONTRIBUTING.md](CONTRIBUTING.md).
For contribution ideas, please refer to the [contribution page](https://contributions.onlydust.xyz).

Here are the steps for local deployment:

* install the [Test Explorer](https://marketplace.visualstudio.com/items?itemName=hbenl.vscode-test-explorer) extension
* fork and clone this repository and open it in VS Code
* run `yarn install`
* run `yarn watch` or start the watch Task in VS Code
* start the debugger

You should now see a second VS Code window, the Extension Development Host.
Open a folder in this window and click the "Test" icon in the Activity bar.
Now you should see the your test suite in the side panel:

![test view](img/tests-view.png)

## 📄 License

**Protostar Test Explorer** is released under the [MIT](LICENSE).

## ❓ Reference 

* [vscode Test API](https://code.visualstudio.com/api/extension-guides/testing)
* [protostar](https://docs.swmansion.com/protostar/)

