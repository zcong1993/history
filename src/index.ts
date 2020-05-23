import { Redis, ValueType } from 'ioredis'

const ONE_YEAR = 86400 * 365
const ONE_MONTH = 86400 * 30

const normalizeRedisValue = (value: any): ValueType => {
  if (['string', 'number'].includes(typeof value) || Buffer.isBuffer(value)) {
    return value as ValueType
  }

  return JSON.stringify(value)
}

export interface History<T = any> {
  add(key: string, data: T): Promise<void>
  get(key: string, isJSON?: boolean): Promise<T[]>
}

export class LengthLimitedHistory<T = any> implements History<T> {
  constructor(
    private readonly redis: Redis,
    private readonly limit: number = 10
  ) {}

  async add(key: string, data: T) {
    const now = new Date().getTime()

    await this.redis
      .pipeline()
      .expire(key, ONE_YEAR)
      .zadd(key, `${now}`, normalizeRedisValue(data) as string)
      .exec()

    await this.remove(key)
  }

  async get(key: string, isJSON: boolean = true): Promise<T[]> {
    const res = await this.redis
      .pipeline()
      .expire(key, ONE_YEAR)
      .zrevrangebyscore(key, '+inf', '-inf')
      .exec()

    const raw = res[1]
    if (!isJSON) {
      return (raw[1] as any) as T[]
    }
    return (raw[1] as any).map((record: any) => JSON.parse(record))
  }

  private async remove(key: string) {
    const count = await this.redis.zcount(key, '-inf', '+inf')
    if (count > this.limit) {
      await this.redis.zremrangebyrank(key, 0, count - this.limit - 1)
    }
  }
}

export class DatedHistory<T = any> implements History<T> {
  constructor(
    private readonly redis: Redis,
    private readonly durationInSeconds: number = ONE_MONTH
  ) {}

  async add(key: string, data: T) {
    const now = new Date().getTime()
    const outdated = now - this.durationInSeconds * 1000

    await this.redis
      .pipeline()
      .expire(key, ONE_YEAR)
      .zadd(key, `${now}`, normalizeRedisValue(data) as string)
      .zremrangebyscore(key, '-inf', outdated)
      .exec()
  }

  async get(key: string, isJSON: boolean = true): Promise<T[]> {
    const now = new Date().getTime()
    const outdated = now - this.durationInSeconds * 1000

    const res = await this.redis
      .pipeline()
      .expire(key, ONE_YEAR)
      .zremrangebyscore(key, '-inf', outdated)
      .zrevrangebyscore(key, '+inf', '-inf')
      .exec()

    const raw = res[2][1]
    if (!isJSON) {
      return (raw as any) as T[]
    }
    return raw.map((record: any) => JSON.parse(record))
  }
}
