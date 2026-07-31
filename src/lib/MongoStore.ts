import { MongoClient, Db, Collection, MongoClientOptions } from 'mongodb';
import type { Store, ClientRateLimitInfo } from 'express-rate-limit';

interface MongoStoreOptions {
  uri: string;
  windowMs: number;
  prefix?: string;
  collectionName?: string;
  clientOptions?: MongoClientOptions;
  createTtlIndex?: boolean;
}

interface RateLimitDocument {
  key: string;
  totalHits: number;
  resetTime: Date;
}

class MongoStore implements Store {
  private client!: MongoClient;
  private db!: Db;
  private collection!: Collection<RateLimitDocument>;

  private windowMs: number;
  prefix: string;
  private uri: string;
  private collectionName: string;
  private clientOptions?: MongoClientOptions;
  private createTtlIndex: boolean;

  constructor(options: MongoStoreOptions) {
    this.windowMs = options.windowMs;
    this.prefix = options.prefix ?? 'mongo_rl_';
    this.uri = options.uri;
    this.collectionName = options.collectionName ?? 'rateLimits';
    this.clientOptions = options.clientOptions;
    this.createTtlIndex = options.createTtlIndex ?? true;
  }

  async init(options: { windowMs: number }) {
    this.windowMs = options.windowMs;

    this.client = new MongoClient(this.uri, this.clientOptions);

    await this.client.connect();

    /**
     * IMPORTANT:
     * Uses database from MongoDB URI
     *
     * mongodb+srv://xxx.mongodb.net/auth
     *
     * will use "auth"
     */
    this.db = this.client.db();

    this.collection = this.db.collection<RateLimitDocument>(
      this.collectionName,
    );

    if (this.createTtlIndex) {
      await this.collection.createIndex(
        { resetTime: 1 },
        { expireAfterSeconds: 0 },
      );
    }
  }

  private prefixKey(key: string) {
    return `${this.prefix}${key}`;
  }

  async get(key: string): Promise<ClientRateLimitInfo | undefined> {
    const data = await this.collection.findOne({
      key: this.prefixKey(key),
    });

    if (!data) {
      return undefined;
    }

    return {
      totalHits: data.totalHits,
      resetTime: new Date(data.resetTime),
    };
  }

  async increment(key: string) {
    const prefixedKey = this.prefixKey(key);

    const data = await this.collection.findOneAndUpdate(
      {
        key: prefixedKey,
      },
      {
        $inc: {
          totalHits: 1,
        },
        $setOnInsert: {
          key: prefixedKey,
          resetTime: new Date(Date.now() + this.windowMs),
        },
      },
      {
        upsert: true,
        returnDocument: 'after',
      },
    );

    return {
      totalHits: data!.totalHits,
      resetTime: new Date(data!.resetTime),
    };
  }

  async decrement(key: string) {
    await this.collection.findOneAndUpdate(
      {
        key: this.prefixKey(key),
      },
      {
        $inc: {
          totalHits: -1,
        },
      },
    );
  }

  async resetKey(key: string) {
    await this.collection.findOneAndUpdate(
      {
        key: this.prefixKey(key),
      },
      {
        $set: {
          totalHits: 0,
        },
      },
    );
  }

  async resetAll() {
    await this.collection.updateMany(
      {},
      {
        $set: {
          totalHits: 0,
        },
      },
    );
  }

  async closeConnection(force?: boolean) {
    await this.client.close(force);
  }
}

export default MongoStore;
