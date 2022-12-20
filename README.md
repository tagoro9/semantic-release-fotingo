# semantic-release-fotingo

A [fotingo](https://github.com/tagoro9/fotingo) [semantic release](https://github.com/semantic-release/semantic-release) plugin.

## Installation

```shell
npm install --save-dev semantic-release-fotingo
yarn add --dev semantic-release-fotingo
```

## Usage

The plugin can be configured in the [**semantic-release** configuration file](https://github.com/semantic-release/semantic-release/blob/master/docs/usage/configuration.md#configuration):

```json
{
  "plugins": ["semantic-release-fotingo", "@semantic-release/release-notes-generator"]
}
```

## Configuration

This plugin does not have any configuration. Look at fotingo's [configuration options](https://github.com/tagoro9/fotingo#configuration)
to see how to customize the execution via environment variables.

If required configuration is missing, the plugin will be a noop.
