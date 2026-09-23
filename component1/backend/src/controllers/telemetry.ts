import { Request, Response } from 'express';
import { TelemetryEvent } from '../models';
import * as mockDb from '../models/mockStore';

/**
 * Bulk telemetry synchronization endpoint.
 * Accepts a batch of raw telemetry events from the VS Code extension SQLite store,
 * deduplicates by event_uuid, and bulk inserts into MongoDB (or mock store).
 *
 * POST /api/telemetry/sync
 */
export const syncTelemetryBatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const rawEvents = req.body?.events || req.body;

    if (!Array.isArray(rawEvents)) {
      res.status(400).json({
        ok: false,
        error: 'Invalid payload format: expected an array of events or an object with an "events" array'
      });
      return;
    }

    if (rawEvents.length === 0) {
      res.status(200).json({
        ok: true,
        message: 'No events to sync',
        syncedCount: 0,
        duplicateCount: 0,
        eventUuids: []
      });
      return;
    }

    // 1. Deduplicate within the incoming batch itself
    const seenUuids = new Set<string>();
    const uniqueIncomingEvents: any[] = [];
    const allIncomingUuids: string[] = [];

    for (const evt of rawEvents) {
      if (!evt || !evt.event_uuid) continue;
      allIncomingUuids.push(evt.event_uuid);
      if (!seenUuids.has(evt.event_uuid)) {
        seenUuids.add(evt.event_uuid);
        uniqueIncomingEvents.push(evt);
      }
    }

    if (uniqueIncomingEvents.length === 0) {
      res.status(400).json({
        ok: false,
        error: 'No valid events found with event_uuid'
      });
      return;
    }

    const uniqueUuids = Array.from(seenUuids);
    let newEventsToInsert: any[] = [];
    let duplicateUuids: string[] = [];

    if (!mockDb.isDbConnected()) {
      // Mock Store Mode
      const existingUuidSet = new Set(
        mockDb.mockTelemetryEvents.map((e: any) => e.event_uuid)
      );

      for (const evt of uniqueIncomingEvents) {
        if (existingUuidSet.has(evt.event_uuid)) {
          duplicateUuids.push(evt.event_uuid);
        } else {
          newEventsToInsert.push({
            ...evt,
            sync_status: 1,
            syncedAt: new Date()
          });
        }
      }

      if (newEventsToInsert.length > 0) {
        mockDb.mockTelemetryEvents.push(...newEventsToInsert);
        mockDb.saveToDisk();
      }
    } else {
      // MongoDB Mode
      const existingRecords = await TelemetryEvent.find(
        { event_uuid: { $in: uniqueUuids } },
        { event_uuid: 1 }
      ).lean();

      const existingUuidSet = new Set(existingRecords.map((r: any) => r.event_uuid));

      for (const evt of uniqueIncomingEvents) {
        if (existingUuidSet.has(evt.event_uuid)) {
          duplicateUuids.push(evt.event_uuid);
        } else {
          newEventsToInsert.push({
            ...evt,
            sync_status: 1,
            syncedAt: new Date()
          });
        }
      }

      if (newEventsToInsert.length > 0) {
        try {
          await TelemetryEvent.insertMany(newEventsToInsert, { ordered: false });
        } catch (insertErr: any) {
          // In case of any concurrent collision on unique index, continue safely
          console.warn('[TelemetryController] Notice during insertMany:', insertErr.message);
        }
      }
    }

    res.status(200).json({
      ok: true,
      syncedCount: newEventsToInsert.length,
      duplicateCount: duplicateUuids.length + (rawEvents.length - uniqueIncomingEvents.length),
      eventUuids: allIncomingUuids
    });
  } catch (err: any) {
    console.error('[TelemetryController] Error syncing telemetry batch:', err);
    res.status(500).json({
      ok: false,
      error: err.message || 'Internal server error during telemetry sync'
    });
  }
};
