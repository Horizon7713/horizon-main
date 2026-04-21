import type { AreaUnit, LengthUnit, VolumeUnit } from "./pdf-viewer-types";

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