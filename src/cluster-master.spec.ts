import * as Redis from 'ioredis-mock';
import { NodeCluster } from './cluster-master';

describe('cluster-master', function() {
  let redis: any = null;
  let cluster: NodeCluster;
  let now = new Date();
  
  beforeEach(async () => {
    redis = new Redis({
      keyPrefix: 'node-',
    });
    cluster = new NodeCluster({
      redis
    });

    await cluster.register();
  });

  it('should be alone master', async () => {
    return expect(await cluster.isMaster()).toBe(true);
  });

  it('should be slave', async () => {
    redis.set('node-test', JSON.stringify({
      hostname: 'test',
      pid: 1,
      startDate: new Date(now.getTime() - 500000),
      updateDate: now,
    }));

    return expect(await cluster.isMaster()).toBe(false);
  });

  it('should be master', async () => {
    redis.set('node-test', JSON.stringify({
      hostname: 'test',
      pid: 1,
      startDate: new Date(now.getTime() + 500000),
      updateDate: new Date(now.getTime() + 500000),
    }));
    
    return expect(await cluster.isMaster()).toBe(true);
  });

})