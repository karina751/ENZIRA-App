// src/constants/Themes.ts

export type ThemeColors = {
  primary: string;
  secondary: string;
  background: string;
  text: string;
};

export const seasonalThemes: Record<string, ThemeColors> = {
  otoño: {
    primary: '#4B3621',
    secondary: '#630330',
    background: '#F5F0E1',
    text: '#1D2951',
  },
  invierno: {
    primary: '#1A1A1D',
    secondary: '#0047AB',
    background: '#E5E7E9',
    text: '#2C3E50',
  },
  primavera: {
    primary: '#FF7F50',
    secondary: '#FDFD96',
    background: '#FFFFFF',
    text: '#4A4A4A',
  },
  verano: {
    primary: '#FF8C00',
    secondary: '#00CED1',
    background: '#F2E8C4',
    text: '#3E2723',
  },
};