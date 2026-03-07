jest.mock('../../src/repositories/sensor.repository');
jest.mock('../../src/store/state.store');
jest.mock('../../src/events/emitter');

const sensorRepo = require('../../src/repositories/sensor.repository');
const stateStore = require('../../src/store/state.store');
const emitter = require('../../src/events/emitter');
const { ingest } = require('../../src/services/ingest.service');

const mockSensor = { id: 'sensor-1', sensor_key: 'B01.F01.R101.motion_1', is_active: true };

beforeEach(() => {
  jest.clearAllMocks();
  sensorRepo.findBySensorKey.mockResolvedValue(mockSensor);
  stateStore.getState.mockReturnValue(null);
  stateStore.setState.mockReturnValue(undefined);
  emitter.emit.mockReturnValue(true);
});

describe('ingest()', () => {
  it('returns sensor_key, state, and a timestamp', async () => {
    const result = await ingest('B01.F01.R101.motion_1', 'detected', null);
    expect(result.sensor_key).toBe('B01.F01.R101.motion_1');
    expect(result.state).toBe('detected');
    expect(result.ts).toBeInstanceOf(Date);
  });

  it('updates the state store', async () => {
    await ingest('B01.F01.R101.motion_1', 'clear', null);
    expect(stateStore.setState).toHaveBeenCalledWith(
      'B01.F01.R101.motion_1',
      mockSensor.id,
      'clear',
      expect.any(Date),
    );
  });

  it('emits state_changed with correct payload', async () => {
    stateStore.getState.mockReturnValue({ state: 'previous', ts: new Date() });
    await ingest('B01.F01.R101.motion_1', 'detected', null);
    expect(emitter.emit).toHaveBeenCalledWith('state_changed', expect.objectContaining({
      sensor_key: 'B01.F01.R101.motion_1',
      sensor_id: mockSensor.id,
      old_state: 'previous',
      new_state: 'detected',
    }));
  });

  it('uses provided unix timestamp when ts is given', async () => {
    const unixTs = 1700000000;
    const result = await ingest('B01.F01.R101.motion_1', 'active', unixTs);
    expect(result.ts).toEqual(new Date(unixTs * 1000));
  });

  it('defaults timestamp to now() when ts is null', async () => {
    const before = Date.now();
    const result = await ingest('B01.F01.R101.motion_1', 'active', null);
    const after = Date.now();
    expect(result.ts.getTime()).toBeGreaterThanOrEqual(before);
    expect(result.ts.getTime()).toBeLessThanOrEqual(after);
  });

  it('throws 404 for unknown sensor_key', async () => {
    sensorRepo.findBySensorKey.mockResolvedValue(null);
    await expect(ingest('unknown.key', 'active', null)).rejects.toMatchObject({ status: 404 });
  });

  it('throws 403 for inactive sensor', async () => {
    sensorRepo.findBySensorKey.mockResolvedValue({ ...mockSensor, is_active: false });
    await expect(ingest('B01.F01.R101.motion_1', 'active', null)).rejects.toMatchObject({ status: 403 });
  });
});
