import type { LengthUnit } from "./pdf-viewer-types";

export type AreaUnit = "in2" | "ft2" | "mm2" | "cm2" | "m2";
export type VolumeUnit = "in3" | "ft3" | "mm3" | "cm3" | "m3";

export interface LengthMeasurementResult {
  value: number;
  unit: LengthUnit;
}

export interface AreaMeasurementResult {
  value: number;
  unit: AreaUnit;
}

export interface VolumeMeasurementResult {
  value: number;
  unit: VolumeUnit;
}