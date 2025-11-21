import { connect, StringCodec, type NatsConnection, type Subscription } from 'nats';

export class NatsClient {
  private nc: NatsConnection | undefined;
  private sc = StringCodec();

  async connect(servers: string[] = ['nats://localhost:4222']) {
    this.nc = await connect({ servers });
    console.log(`Connected to NATS at ${servers.join(',')}`);
  }

  async publish(subject: string, data: any) {
    if (!this.nc) throw new Error('NATS not connected');
    this.nc.publish(subject, this.sc.encode(JSON.stringify(data)));
  }

  subscribe(subject: string, callback: (data: any) => void): Subscription {
    if (!this.nc) throw new Error('NATS not connected');
    const sub = this.nc.subscribe(subject);
    (async () => {
      for await (const m of sub) {
        callback(JSON.parse(this.sc.decode(m.data)));
      }
    })();
    return sub;
  }

  async close() {
    await this.nc?.close();
  }
}

export const natsClient = new NatsClient();
