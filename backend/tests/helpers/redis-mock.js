// Shared Redis mock for integration tests — prevents real Redis connections.
// Must be called via jest.mock() before any app imports.
const store = new Map();

const mock = {
  publisher: {
    hset: jest.fn(async (_key, field, val) => { store.set(field, val); }),
    hget: jest.fn(async (_key, field) => store.get(field) ?? null),
    hgetall: jest.fn(async () => Object.fromEntries(store)),
    publish: jest.fn().mockResolvedValue(1),
  },
  subscriber: { subscribe: jest.fn(), on: jest.fn() },
  __store: store,
};

module.exports = mock;
