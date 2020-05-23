import * as Redis from 'ioredis'
import { LengthLimitedHistory, DatedHistory } from '../src'

const redis = new Redis(process.env.REDIS_URI)

const sleep = (n: number) => new Promise((r) => setTimeout(r, n))

const usedKeys: string[] = []

afterEach(async () => {
  await redis.del(usedKeys)
})

it('LengthLimitedHistory should work well', async () => {
  const llh = new LengthLimitedHistory(redis, 3)
  const key = 'test1'
  usedKeys.push(key)
  await llh.add(key, { name: 1 })
  const res1 = await llh.get(key, false)
  const res11 = await llh.get(key)
  expect(res1).toEqual(['{"name":1}'])
  expect(res11).toEqual([{ name: 1 }])

  await llh.add(key, { name: 2 })
  const res2 = await llh.get(key, false)
  const res22 = await llh.get(key)
  expect(res2).toEqual(['{"name":2}', '{"name":1}'])
  expect(res22).toEqual([{ name: 2 }, { name: 1 }])
  await llh.add(key, { name: 3 })
  const res3 = await llh.get(key, false)
  const res33 = await llh.get(key, true)
  expect(res3).toEqual(['{"name":3}', '{"name":2}', '{"name":1}'])
  expect(res33).toEqual([{ name: 3 }, { name: 2 }, { name: 1 }])
  // hit max
  await llh.add(key, { name: 4 })
  const res4 = await llh.get(key, false)
  const res44 = await llh.get(key)
  expect(res4).toEqual(['{"name":4}', '{"name":3}', '{"name":2}'])
  expect(res44).toEqual([{ name: 4 }, { name: 3 }, { name: 2 }])
  // duplicate
  await llh.add(key, { name: 2 })
  const res5 = await llh.get(key, false)
  const res55 = await llh.get(key)
  expect(res5).toEqual(['{"name":2}', '{"name":4}', '{"name":3}'])
  expect(res55).toEqual([{ name: 2 }, { name: 4 }, { name: 3 }])
})

it('DatedHistory should work well', async () => {
  const dh = new DatedHistory(redis, 3)

  const key = 'test2'
  usedKeys.push(key)

  await dh.add(key, { name: 1 })
  const res1 = await dh.get(key, false)
  const res11 = await dh.get(key)
  expect(res1).toEqual(['{"name":1}'])
  expect(res11).toEqual([{ name: 1 }])

  await dh.add(key, { name: 2 })
  const res2 = await dh.get(key, false)
  const res22 = await dh.get(key)
  expect(res2).toEqual(['{"name":2}', '{"name":1}'])
  expect(res22).toEqual([{ name: 2 }, { name: 1 }])
  await dh.add(key, { name: 3 })
  const res3 = await dh.get(key, false)
  const res33 = await dh.get(key, true)
  expect(res3).toEqual(['{"name":3}', '{"name":2}', '{"name":1}'])
  expect(res33).toEqual([{ name: 3 }, { name: 2 }, { name: 1 }])

  await sleep(3000)
  const res4 = await dh.get(key)
  expect(res4).toEqual([])
})

it('sample value should works well', async () => {
  const dh = new DatedHistory(redis, 3)
  const llh = new LengthLimitedHistory(redis, 3)

  const key = 'test3'
  const key2 = 'test4'
  usedKeys.push(key)
  usedKeys.push(key2)

  await dh.add(key, 1)
  const res = await dh.get(key, false)
  expect(res).toEqual(['1'])

  await llh.add(key2, 1)
  const res2 = await llh.get(key2, false)
  expect(res2).toEqual(['1'])
})
