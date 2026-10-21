import {
  encodeState,
  normalizers,
  recordId,
  type BookArea,
  type BookState,
  type BookRecord,
} from "./model";

export function localBookKey(
  area: BookArea,
  userId?: string | null,
  key = "current",
): string {
  const id = userId || "guest";
  const keys = {
    startingCharge: `starting_charge_profile_${userId || "local"}`,
    profile: `my_controllables_profile_${id}`,
    dex: `controllables_dex_${id}`,
    missions: `local_mission_drop_${id}`,
    reading: `read_along_progress_${id}`,
    track: `formation_selected_track_${id}`,
    crm: `control_release_move_${id}_${key}`,
  };
  return keys[area];
}
export function readLocalBook<A extends BookArea>(
  area: A,
  userId?: string | null,
  key = "current",
): BookState<A> {
  try {
    const raw = localStorage.getItem(localBookKey(area, userId, key));
    return normalizers[area](
      raw === null
        ? undefined
        : area === "track"
          ? raw
          : area === "startingCharge"
            ? { result: JSON.parse(raw) }
            : JSON.parse(raw),
    ) as BookState<A>;
  } catch {
    return normalizers[area](undefined) as BookState<A>;
  }
}
export function writeLocalBook<A extends BookArea>(
  area: A,
  userId: string | null | undefined,
  key: string,
  value: BookState<A>,
): void {
  localStorage.setItem(
    localBookKey(area, userId, key),
    area === "track"
      ? String(value)
      : JSON.stringify(
          area === "startingCharge"
            ? (value as BookState<"startingCharge">).result
            : value,
        ),
  );
  window.dispatchEvent(new Event("book-loop-local-change"));
}
export const importDecisionKey = (userId: string) =>
  `book_loop_import_decision_v1_${userId}`;

export function collectLocalBookRecords(
  storage: Storage,
  userId: string,
): Omit<BookRecord, "revision">[] {
  const records = new Map<string, Omit<BookRecord, "revision">>();
  // Only this account and explicitly disclosed guest data; never scan other accounts.
  for (const owner of ["guest", userId]) {
    for (const area of [
      "profile",
      "dex",
      "missions",
      "reading",
      "track",
      "startingCharge",
    ] as BookArea[]) {
      const raw = storage.getItem(
        localBookKey(
          area,
          area === "startingCharge" && owner === "guest" ? "local" : owner,
        ),
      );
      if (raw === null) continue;
      const value = normalizers[area](
        area === "track"
          ? raw
          : area === "startingCharge"
            ? { result: JSON.parse(raw) }
            : JSON.parse(raw),
      );
      for (const row of encodeState(area, "current", value))
        records.set(recordId(row), row);
    }
    const prefix = `control_release_move_${owner}_`;
    for (let i = 0; i < storage.length; i++) {
      const localKey = storage.key(i)!;
      if (!localKey.startsWith(prefix)) continue;
      const date = localKey.slice(prefix.length);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
      const row = {
        kind: "crm" as const,
        record_key: date,
        payload: normalizers.crm(JSON.parse(storage.getItem(localKey)!)),
      };
      records.set(recordId(row), row);
    }
  }
  return [...records.values()].sort((a, b) =>
    recordId(a).localeCompare(recordId(b)),
  );
}
export async function fingerprintImport(
  records: Omit<BookRecord, "revision">[],
): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(records));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Setup choices alone are not progress worth interrupting a new account for. */
export function hasMeaningfulLocalProgress(records: Omit<BookRecord, "revision">[]): boolean {
  return records.some(row => {
    if (row.kind === "track" || row.kind === "startingCharge") return false;
    if (row.kind === "promise" || row.kind === "dex") return true;
    if (row.kind === "reading") {
      const reading = normalizers.reading(row.payload);
      const defaults = normalizers.reading(undefined);
      // Normalization creates startedAt even for an empty object; a timestamp alone is not progress.
      return reading.completedSectionIds.length > 0 || reading.completedRepIds.length > 0 || Boolean(reading.bookCompletedAt) || reading.currentSectionId !== defaults.currentSectionId;
    }
    const defaults = encodeState(row.kind, row.record_key, normalizers[row.kind](undefined));
    return !defaults.some(defaultRow => JSON.stringify(defaultRow.payload) === JSON.stringify(row.payload));
  });
}
export function importProgressTitle(count: number): string {
  return `Import ${count} saved ${count === 1 ? "item" : "items"} from this browser?`;
}
