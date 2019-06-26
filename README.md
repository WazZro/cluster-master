# is-cluster-master

This module finds the master node instance in a cluster by inserting the nodes in a Redis and choosing the master by which node is the oldest.
Each node checks into redis on a set timeout (default 60 seconds). If the master node dies, redis will expire the record. Ioredis and Redis is REQUIRED for work.

## Installation

      npm i is-cluster-master

## Usage

Use keyPrefix parameter of IORedis connection!

```
const Redis = require('ioredis');
const NodeCluster = require('is-cluster-master');

const redis = new Redis(6379, 'localhost', {
  keyPrefix: 'node-',
});

const master = new NodeCluster({
  redis,
  keyPrefix: 'node-',
  timeout: 60,
});

master.on('Changed', function() {
  console.log('The master variable has changed');
});

master.on('master', function() {
  console.log('The process has been promoted to master');
});

master.on('slave', function(){
  console.log('The process has been demoted to slave');
});

console.log(master.isMaster());
```

## Options

When starting the worker, you can specify options in an object to update the default values.

    new NodeCluster({
        timeout: 120, // How often the nodes check. In seconds, default 60.
        keyPrefix: 'node', // Prefix using in redis connection, default 'node-'.
        redis: new Redis({...}), // IORedis connection
    });

## Contributing

1. Fork it!
2. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request :D

## History

* 1.0.0 Initial release