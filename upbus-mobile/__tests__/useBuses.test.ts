import { renderHook, act } from '@testing-library/react-native';

jest.mock('../lib/api', () => ({ getBuses: jest.fn() }));
import { getBuses } from '../lib/api';
const mockGetBuses = getBuses as jest.MockedFunction<typeof getBuses>;

// Import after mock
const { useBuses } = require('../hooks/useBuses');

describe('useBuses', () => {
  beforeEach(() => { jest.useFakeTimers(); mockGetBuses.mockResolvedValue([]); });
  afterEach(() => jest.useRealTimers());

  it('returns empty array initially', async () => {
    const { result } = await renderHook(() => useBuses());
    expect(result.current.buses).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('populates buses after fetch', async () => {
    const fakeBus = { imei_id: 'TC001', latitude: 19.02, longitude: 99.89, speed: 10, bearing: 0, soc: 80, acc: 1 as const, color: 'Green' as const, driver: 'Test', date: '', department: null };
    mockGetBuses.mockResolvedValue([fakeBus]);
    const { result } = await renderHook(() => useBuses());
    await act(async () => { await Promise.resolve(); });
    expect(result.current.buses).toEqual([fakeBus]);
  });
});
