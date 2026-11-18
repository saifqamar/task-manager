import { create } from 'zustand';
import type { Weather } from '@app/shared';
import { api, ApiClientError } from '@/lib/api';
import { readStorage, writeStorage } from '@/lib/storage';

const CITY_KEY = 'weather.city';
const DEFAULT_CITY = 'London';

interface WeatherState {
  city: string;
  weather: Weather | null;
  status: 'idle' | 'loading' | 'success' | 'not-found' | 'error';
  fetchWeather(city?: string): Promise<void>;
}

export const useWeatherStore = create<WeatherState>()((set, get) => ({
  city: readStorage(CITY_KEY) ?? DEFAULT_CITY,
  weather: null,
  status: 'idle',

  async fetchWeather(city = get().city) {
    set({ status: 'loading' });
    try {
      const weather = await api.getWeather(city);
      writeStorage(CITY_KEY, city);
      set({ city, weather, status: 'success' });
    } catch (error) {
      const notFound = error instanceof ApiClientError && error.code === 'CITY_NOT_FOUND';
      set({ status: notFound ? 'not-found' : 'error' });
    }
  },
}));
