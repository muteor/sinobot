```
        .__                 ___.              __
  ______|__|  ____    ____  \_ |__    ____  _/  |_
 /  ___/|  | /    \  /  _ \  | __ \  /  _ \ \   __\
 \___ \ |  ||   |  \(  <_> ) | \_\ \(  <_> ) |  |
/____  >|__||___|  / \____/  |___  / \____/  |__|
     \/          \/              \/
Sinobot does things for you and keeps logs...
```

This is a slack bot that runs commands on demand and keeps logs of the result. 
It is designed to be as generic as possible so that it can be easily extended to perform whatever task you need.
The default use-case is running SSH commands on a remote system and then reporting success/fail to a slack channel/group.

This project is an experiment and uses Babel JS for ES2015 & async/await.

## Install

```bash
$ git clone https://github.com/muteor/sinobot.git && cd sinobot
$ npm install
$ npm run build
$ npm start -- --config /path/to/config.json # Note the extra -- here
```

## Configuration

Configuration is provided by a `.json` file and the `--config` cli option.

### Example Config
```js
{
  "port": 9777,
  "slackToken": "aslacktoken",
  "logPath": "/var/log/sinobot/sino.log",
  "storagePath": "./data",

  "projects": [
    {
      // The project name
      "name": "My Project",

      // Unique ident
      "id": "p1",

      // Command
      "command": {
        "type": "ssh",
        "config": {
          "commands": [
            "uptime"
          ],
          "ssh": {
            "privateKey": "/..../.ssh/id_rsa",
            "username": "sino"
          }
        }
      },

      // Resources
      "resource": {
        "type": "pool",
        "config": {
          "deadline": 30, // Seconds
          "resources": ["server1", "server2", "server3"]
        }
      },

      // Notification
      "notification": {
        "type": "shell-failure",
        "config": {
          "msg": "Build failed, non-zero command return"
        }
      },

      // Artifacts
      "artifact": {
        "max": 10
      }
    }
  ]
}
```

## Resources

A resource is the thing that a command will run against, there are two different resource handlers, single and pool.
Single simply returns a single string resource and pool provides random selection for a pool of resources and does basic
locking.

### Single Config

```js
"resource": {
  "type": "single",
  "config": {
    "resource": "server1"
  }
},
```

### Pool Config

```js
"resource": {
  "type": "pool",
  "config": {
    "deadline": 30, // Seconds
    "resources": ["server1", "server2", "server3"]
  }
},
```

## Commands

Command executes something on the resource, there is only one command currently and this is SSH.

### SSH Config

```js
"command": {
  "type": "ssh",
  "config": {
    "commands": [
      "uptime"
    ],
    "ssh": {
      "privateKey": "/..../.ssh/id_rsa",
      "username": "sino"
    }
  }
},
```

The `ssh` key takes same config as https://github.com/mscdex/ssh2

## Parsers

Parsers are project specific scripts that can be used to change or process the command result in any non-standard way.
To create a parser extend the `Parser` class (`lib/parser`) and implement the `parse()` method, multiple parsers can be chained
together.

Parsers are loaded either from `./parser` or `node_modules`.

### Parser Config

```js
"result": {
  "parsers": ["parser1", "parser2"] // FIFO order
},
```

## Notifiers

Notifiers communicate with slack (or anything else you want), there are two notifiers currently `shell-failure` and `shell-success`.

### Notifier Config

```js
"notification": {
  "type": "shell-failure",
  "config": {
    "msg": "Build failed, non-zero command return"
  }
},
```

## Artifacts

Sino will store a certain amount of logs and rotate out old ones for you.

### Artifact Config
```js
"artifact": {
  "max": 10
}
```

## Slack Commands

In slack commands either by direct message or mention.

`list projects`
-- Show list of projects

`show {projectId} status`
Get the project status

`show {projectId} logs`
-- Show list of logs for the project

`show {projectId} log {logId}`
-- Show full log from project

`trigger {projectId}`
-- Trigger the project

Example:

`@sinobot trigger p1`

## Extending

You can use your own modules by extending the base classes and loading via node_modules.

```js
"notification": {
  "type": "my-custom-notifier",
  "config": {
    "my": "config"
  }
},
```
