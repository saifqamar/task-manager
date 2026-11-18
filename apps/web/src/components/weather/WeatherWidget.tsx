import { useEffect, useState, type FormEvent } from 'react';
import { CloudOff, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { useWeatherStore } from '@/store/weather-store';

export function WeatherWidget() {
  const { city, weather, status, fetchWeather } = useWeatherStore();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(city);

  useEffect(() => {
    void fetchWeather();
  }, [fetchWeather]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const next = draft.trim();
    if (!next) return;
    await fetchWeather(next);
    if (useWeatherStore.getState().status === 'success') setOpen(false);
  }

  const loading = status === 'loading' || status === 'idle';

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setDraft(city);
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className="hover:bg-accent focus-visible:ring-ring/50 flex h-12 items-center gap-2 rounded-lg border px-3 text-left transition-colors outline-none focus-visible:ring-[3px]"
          aria-label={
            weather
              ? `Weather in ${weather.city}: ${Math.round(weather.temperature)}°C, ${weather.description}. Change city`
              : 'Weather. Change city'
          }
        >
          {weather ? (
            <>
              <img
                src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`}
                alt=""
                width={36}
                height={36}
                className="-my-1"
              />
              <span className="leading-tight">
                <span className="block text-sm font-semibold tabular-nums">
                  {Math.round(weather.temperature)}°C
                </span>
                <span className="text-muted-foreground block max-w-36 truncate text-xs capitalize">
                  {weather.city} · {weather.description}
                </span>
              </span>
            </>
          ) : loading ? (
            <>
              <Skeleton className="size-8 rounded-full" />
              <Skeleton className="h-8 w-20" />
            </>
          ) : (
            <span className="text-muted-foreground flex items-center gap-2 text-xs">
              <CloudOff className="size-4" aria-hidden />
              Weather unavailable
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-72">
        <form onSubmit={handleSubmit} className="space-y-3">
          <Label htmlFor="weather-city">City</Label>
          <div className="flex gap-2">
            <Input
              id="weather-city"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="e.g. Lahore"
              maxLength={100}
              autoFocus
            />
            <Button type="submit" disabled={status === 'loading'}>
              <MapPin aria-hidden />
              <span className="sr-only">Show weather</span>
            </Button>
          </div>
          {status === 'not-found' && (
            <p role="alert" className="text-destructive text-sm">
              City not found. Check the spelling.
            </p>
          )}
          {status === 'error' && (
            <p role="alert" className="text-destructive text-sm">
              Weather service is unavailable. Try again later.
            </p>
          )}
          {weather && (
            <dl className="text-muted-foreground grid grid-cols-3 gap-2 border-t pt-3 text-xs">
              <div>
                <dt>Feels like</dt>
                <dd className="text-foreground font-medium">{Math.round(weather.feelsLike)}°C</dd>
              </div>
              <div>
                <dt>Humidity</dt>
                <dd className="text-foreground font-medium">{weather.humidity}%</dd>
              </div>
              <div>
                <dt>Wind</dt>
                <dd className="text-foreground font-medium">{weather.windSpeed} m/s</dd>
              </div>
            </dl>
          )}
          <p className="text-muted-foreground text-[11px]">Data from OpenWeather</p>
        </form>
      </PopoverContent>
    </Popover>
  );
}
