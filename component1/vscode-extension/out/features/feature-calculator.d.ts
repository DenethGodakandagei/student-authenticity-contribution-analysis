import { TelemetryEvent, WindowFeatures } from '../types';
/**
 * Compute all 18 ML features from a chronological array of TelemetryEvent rows
 * within a defined [windowStart, windowEnd] time slice.
 *
 * @param events Telemetry events occurring within the window
 * @param windowStart Window start timestamp (Unix epoch ms)
 * @param windowEnd Window end timestamp (Unix epoch ms)
 * @param sessionId Optional session identifier
 * @returns Fully populated WindowFeatures object
 */
export declare function computeWindowFeatures(events: TelemetryEvent[], windowStart: number, windowEnd: number, sessionId?: string): WindowFeatures;
