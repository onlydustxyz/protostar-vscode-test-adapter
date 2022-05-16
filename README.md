<div align="center">
  <h1 align="center">Protostar Test Explorer</h1>
  <p align="center">
    <a href="http://makeapullrequest.com">
      <img alt="pull requests welcome badge" src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat">
    </a>
    <a href="https://twitter.com/intent/follow?screen_name=onlydust_xyz">
        <img src="https://img.shields.io/twitter/follow/onlydust_xyz?style=social&logo=twitter"
            alt="follow on Twitter"></a>
    <a href="https://opensource.org/licenses/Apache-2.0"><img src="https://img.shields.io/badge/License-Apache%202.0-blue.svg"
            alt="License"></a>
    <a href=""><img src="https://img.shields.io/badge/semver-0.0.1-blue"
            alt="License"></a>            
  </p>
  
  <h3 align="center">vscode extension to view protostar tests in the Test Explorer.</h3>
</div>

This repository contains a `TestAdapter` extension for [protostar](https://docs.swmansion.com/protostar/) that works with the
[Test Explorer](https://marketplace.visualstudio.com/items?itemName=hbenl.vscode-test-explorer) extension.

More documentation can be found in the [Test Adapter API repository](https://github.com/hbenl/vscode-test-adapter-api).

## Contributing

* install the [Test Explorer](https://marketplace.visualstudio.com/items?itemName=hbenl.vscode-test-explorer) extension
* fork and clone this repository and open it in VS Code
* run `npm install`
* run `npm run watch` or start the watch Task in VS Code
* start the debugger

You should now see a second VS Code window, the Extension Development Host.
Open a folder in this window and click the "Test" icon in the Activity bar.
Now you should see the your test suite in the side panel:

![The fake example test suite](img/tests-view.png)

## Completing the implementation

* implement the `debug()` method
* Fix the `cancel()` method (sometimes it gets flaky)
* watch the configuration for any changes that may affect the loading of test definitions and reload the test definitions if necessary
* watch the workspace for any changes to the test files and reload the test definitions if necessary
* watch the configuration for any changes that may affect the results of running the tests and emit an `autorun` event if necessary
* watch the workspace for any changes to the source files and emit an `autorun` event if necessary
* parse protostar test output to show the results of a test
* use code lens to highlights assertion failures
* find a way to have smoother test results (and not all at once)