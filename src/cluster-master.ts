import { Redis } from 'ioredis';
import * as os from 'os';
import { EventEmitter } from 'events';

export interface Node {
  hostname: string;
  pid: number;
  memory?: any;
  uptime?: any;
  startDate: Date;
  updateDate?: Date;
}

export interface NodeClusterConfig {
  redis: Redis;
  timeout?: number;
  keyPrefix?: string;
}

export class NodeCluster extends EventEmitter {
  private readonly DEFAULT_PREFIX = 'node-';
  private readonly DEFAULT_TIMEOUT = 60;

  private readonly redis: Redis;
  private readonly timeout: number;
  private master: boolean;
  private keyPrefix: string;
  private nodeIdentificator: string;
  private hostname: string;

  constructor(config: NodeClusterConfig) {
    super();
    this.redis = config.redis;
    this.master = false;
    this.timeout = config.timeout ? config.timeout : this.DEFAULT_TIMEOUT;
    this.keyPrefix = config.keyPrefix ? config.keyPrefix : this.DEFAULT_PREFIX;
    this.nodeIdentificator = `${os.hostname()}${process.pid}`;
    this.hostname = os.hostname();
  }

  private async getCurrentNode(): Promise<Node> {
    const res = await this.redis.get(this.nodeIdentificator);

    return res ? JSON.parse(res) : null;
  }

  private async checkMaster(): Promise<void> {
    const isMaster = await this.isMaster();

    if (isMaster !== this.master) {
      this.emit('Changed');
      this.master = isMaster;
      if (this.master)
        this.emit('master');
      else
        this.emit('slave');
    }
  }

  private async getNodes(): Promise<Node[]> {
    const keys = await this.redis.keys(`${this.keyPrefix}*`);
    const promises = [];
    const nodes = [];

    for (const key of keys) {
      const keyWithOutPrefix = key.replace(this.keyPrefix, '');
      promises.push(this.redis.get(keyWithOutPrefix));
    }

    const result = await Promise.all(promises);
    for (const node of result) {
      if (!node) continue;
      
      const parsedNode = JSON.parse(node);
      parsedNode.startDate = new Date(parsedNode.startDate);
      parsedNode.updateDate = new Date(parsedNode.updateDate);
      nodes.push(parsedNode);
    }

    return nodes;
  }

  public async register(): Promise<void> {
    const node: Node = {
      hostname: this.hostname,
      pid: process.pid,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      startDate: new Date(),
      updateDate: new Date(),
    }

    await this.redis
      .pipeline()
      .set(this.nodeIdentificator, JSON.stringify(node))
      .expire(this.nodeIdentificator, this.timeout + 60)
      .exec();

    await this.checkMaster();
    this.process();
    this.emit('register');
  }

  process(): void {
    setInterval(async () => {
      const node = await this.getCurrentNode();
      node.updateDate = new Date();
      node.memory = process.memoryUsage();
      node.uptime = process.uptime();

      await this.redis
        .pipeline()
        .set(this.nodeIdentificator, JSON.stringify(node))
        .expire(this.nodeIdentificator, this.timeout + 60)
        .exec();

      this.checkMaster();
    },
      this.timeout * 1000);
  }

  public async isMaster(): Promise<boolean> {
    const nodes = await this.getNodes();

    nodes.sort((a: Node, b: Node) => {
      return a.startDate.getTime() - b.startDate.getTime();
    })

    return this.nodeIdentificator === `${nodes[0].hostname}${nodes[0].pid}`;
  }
}