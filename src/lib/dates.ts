/** Today's date in Copenhagen as yyyy-mm-dd, whatever the server's own time zone is. */
export function todayInCopenhagen(now = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Copenhagen" }).format(now);
}
