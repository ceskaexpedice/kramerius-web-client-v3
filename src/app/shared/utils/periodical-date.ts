/**
 * Parsing of periodical issue publication dates.
 *
 * Per the cataloguing standards for periodicals, `dateIssued` may be a range of
 * days ("issue covering several days"). SOLR then carries both ends of the range
 * in `date_range_start.*` / `date_range_end.*`, while `date.str` holds the human
 * readable form, e.g.:
 *
 *   03.-09.01.1986        day-only start, month/year taken from the range end
 *   31.01. –01.02.1998    day+month start, year taken from the range end
 *   31.12.1998–01.01.1999 both ends fully qualified
 *   12.05.1986            plain single day
 *
 * Throughout the app we display and place such issues by the FIRST day of the
 * range, so a range issue lands on the calendar and reads consistently on cards.
 */

/** Dash characters that may separate the two ends of a range in `date.str`. */
const RANGE_SEPARATOR = /[–—-]/;

export interface VolumeYearFields {
  year?: string;
  'date.str'?: string;
  'date_range_start.year'?: number | string;
  'date_range_end.year'?: number | string;
}

export interface IssueDateFields {
  'date.str'?: string;
  'date_range_start.day'?: number | string;
  'date_range_start.month'?: number | string;
  'date_range_start.year'?: number | string;
  'date_range_end.day'?: number | string;
  'date_range_end.month'?: number | string;
  'date_range_end.year'?: number | string;
}

function toNumber(value: number | string | undefined | null): number | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function buildDate(day: number | null, month: number | null, year: number | null): Date | null {
  if (!day || !month || !year) {
    return null;
  }
  if (day < 1 || day > 31 || month < 1 || month > 12) {
    return null;
  }
  return new Date(year, month - 1, day);
}

/**
 * Parses one side of a date string into its numeric parts. Parts the string does
 * not carry come back as null so the caller can inherit them from the other end.
 */
function parseDatePart(part: string): { day: number | null; month: number | null; year: number | null } {
  const numbers = part
    .split('.')
    .map(segment => segment.trim())
    .filter(segment => segment.length > 0)
    .map(segment => toNumber(segment));

  const [day = null, month = null, year = null] = numbers;
  return { day, month, year };
}

/**
 * Parses a Czech-formatted `date.str` and returns the FIRST day it denotes.
 * Handles plain `DD.MM.YYYY` as well as all range spellings above; a range's
 * missing start components are inherited from the range end.
 */
export function parseIssueDateStr(str: string | undefined | null): Date | null {
  if (!str) {
    return null;
  }

  const parts = str.split(RANGE_SEPARATOR).map(part => part.trim()).filter(part => part.length > 0);
  if (parts.length === 0) {
    return null;
  }

  const start = parseDatePart(parts[0]);
  // A range's start may omit the month and/or year; both are then only spelled
  // out on the range end, so inherit whatever the start is missing.
  const end = parts.length > 1 ? parseDatePart(parts[parts.length - 1]) : start;

  return buildDate(start.day, start.month ?? end.month, start.year ?? end.year);
}

/**
 * Returns the first day of an issue's publication date. Prefers the structured
 * SOLR range fields and falls back to parsing `date.str` when they are absent.
 */
export function parseIssueStartDate(item: IssueDateFields | undefined | null): Date | null {
  if (!item) {
    return null;
  }

  const fromFields = buildDate(
    toNumber(item['date_range_start.day']),
    toNumber(item['date_range_start.month']),
    toNumber(item['date_range_start.year']),
  );

  return fromFields ?? parseIssueDateStr(item['date.str']);
}

/**
 * `YYYY-MM-DD` key for a calendar day, read from the LOCAL calendar fields.
 *
 * Issue dates and the calendar's own day cells are both built as local midnight
 * (`new Date(y, m, d)`). Formatting those with `toISOString()` converts them to
 * UTC first, which east of Greenwich lands on the previous day — 12.05.1986 keyed
 * as "1986-05-11", and 1 January slipped into the previous year. Both sides of a
 * lookup shifted alike so entries still matched, but the keys named the wrong day
 * and anything comparing them against a real date would silently be off by one.
 */
export function formatLocalDateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Label for an issue card: the first day of the range as `D.M.`, falling back to
 * the raw `date.str` when no date can be derived.
 */
export function formatIssueDateLabel(item: IssueDateFields | undefined | null): string {
  const date = parseIssueStartDate(item);
  if (!date) {
    return item?.['date.str'] ?? '';
  }
  return `${date.getDate()}.${date.getMonth() + 1}.`;
}

/**
 * Does a periodical volume cover the given calendar year?
 *
 * A volume's `year` label is `date.str` verbatim, which for periodicals whose
 * volume spans a season reads as a RANGE - Světozor carries "1905-1906". A
 * numeric year taken from a displayed issue date therefore never equals the
 * label, and a plain `y.year === year` lookup finds no volume at all (issue
 * #169). Match against the structured range fields instead, falling back to the
 * label only when they are absent.
 */
export function volumeCoversYear(volume: VolumeYearFields | undefined | null, year: string): boolean {
  if (!volume) {
    return false;
  }

  const target = toNumber(year);
  if (target === null) {
    return false;
  }

  const start = toNumber(volume['date_range_start.year']);
  const end = toNumber(volume['date_range_end.year']);
  if (start !== null || end !== null) {
    const from = start ?? end!;
    const to = end ?? start!;
    return target >= from && target <= to;
  }

  // No structured range: fall back to the label, which may itself be a range.
  const label = volume.year ?? volume['date.str'];
  if (!label) {
    return false;
  }
  const bounds = String(label)
    .split(RANGE_SEPARATOR)
    .map(part => toNumber(part.trim()))
    .filter((n): n is number => n !== null);
  if (bounds.length === 0) {
    return false;
  }
  return target >= bounds[0] && target <= bounds[bounds.length - 1];
}

/**
 * The volume that should own `year`.
 *
 * A year can fall inside two consecutive spanning volumes ("1904-1905" and
 * "1905-1906" both cover 1905). Prefer the one that STARTS in that year: that is
 * where the bulk of its issues sit, and it is the volume the year navigation
 * lands on.
 */
export function findVolumeForYear<T extends VolumeYearFields>(volumes: readonly T[] | undefined | null, year: string): T | undefined {
  if (!volumes?.length) {
    return undefined;
  }

  const covering = volumes.filter(volume => volumeCoversYear(volume, year));
  if (covering.length === 0) {
    return undefined;
  }

  const target = toNumber(year);
  return covering.find(volume => toNumber(volume['date_range_start.year']) === target) ?? covering[0];
}
