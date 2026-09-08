import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  COUNTRIES,
  INDIA_STATES,
  INDIA_CITIES,
  INDIA_DISTRICTS,
} from "@/lib/location-data.ts";

export type LocationValue = {
  country?: string;
  state?: string;
  district?: string;
  city?: string;
};

type Props = {
  value: LocationValue;
  onChange: (val: LocationValue) => void;
  defaultCountry?: string;
  compact?: boolean; // show inline in a grid vs stacked
};

export default function LocationSelector({ value, onChange, defaultCountry, compact }: Props) {
  const [cityInput, setCityInput] = useState(value.city ?? "");

  // When country changes, reset state/district/city
  function handleCountry(country: string) {
    setCityInput("");
    onChange({ country: country === "none" ? undefined : country });
  }

  function handleState(state: string) {
    setCityInput("");
    onChange({ ...value, state: state === "none" ? undefined : state, district: undefined, city: undefined });
  }

  function handleDistrict(district: string) {
    onChange({ ...value, district: district === "none" ? undefined : district, city: undefined });
    setCityInput("");
  }

  function handleCity(city: string) {
    onChange({ ...value, city: city === "none" ? undefined : city });
  }

  function handleCityInput(v: string) {
    setCityInput(v);
    onChange({ ...value, city: v || undefined });
  }

  // Sync external city value
  useEffect(() => {
    if (value.city !== cityInput) setCityInput(value.city ?? "");
  }, [value.city]);

  const isIndia = value.country === "IN" || (!value.country && defaultCountry === "IN");
  const selectedState = value.state;
  const availableCities = selectedState && isIndia ? (INDIA_CITIES[selectedState] ?? []) : [];
  const availableDistricts = selectedState && isIndia ? (INDIA_DISTRICTS[selectedState] ?? []) : [];

  const gridClass = compact
    ? "grid grid-cols-2 gap-2"
    : "space-y-3";

  return (
    <div className={gridClass}>
      {/* Country */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Country</Label>
        <Select
          value={value.country ?? defaultCountry ?? "none"}
          onValueChange={handleCountry}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="Select country" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Any country</SelectItem>
            {COUNTRIES.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* State — India only */}
      {isIndia && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">State / UT</Label>
          <Select value={value.state ?? "none"} onValueChange={handleState}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Select state" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              <SelectItem value="none">All states</SelectItem>
              {INDIA_STATES.map((s) => (
                <SelectItem key={s.code} value={s.name}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* District — India + state selected */}
      {isIndia && selectedState && availableDistricts.length > 0 && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">District</Label>
          <Select value={value.district ?? "none"} onValueChange={handleDistrict}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Select district" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              <SelectItem value="none">All districts</SelectItem>
              {availableDistricts.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* City — dropdown if India with options, else text input */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">City</Label>
        {isIndia && availableCities.length > 0 ? (
          <Select value={value.city ?? "none"} onValueChange={handleCity}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Select city" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              <SelectItem value="none">All cities</SelectItem>
              {availableCities.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            className="h-8 text-sm"
            placeholder="e.g. London, Sydney"
            value={cityInput}
            onChange={(e) => handleCityInput(e.target.value)}
          />
        )}
      </div>
    </div>
  );
}
