/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CountryData {
  id: string; // ISO 3166-1 numeric or alpha-3
  name: string;
  aliases: string[];
  area: number; // in sq km
  gdp: number; // in millions USD
  continent: 'Africa' | 'Asia' | 'Europe' | 'North America' | 'South America' | 'Oceania' | 'Antarctica';
  capital?: string;
  capitalCoords?: { lat: number; lng: number };
  facts?: string[];
}

export interface GameState {
  score: number;
  timeElapsed: number; // in seconds
  guessedCountries: Set<string>; // Set of country IDs
  isFinished: boolean;
  startTime: number | null;
}

export interface WorldData {
  totalArea: number;
  countries: CountryData[];
}
