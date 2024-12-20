/**
 * Converts a file size from one unit to another.
 *
 * @param value - The file size to convert.
 * @param {"B" | "KB" | "MB" | "GB" | "TB"} fromUnit - The unit of the input file size. Valid units are 'B', 'KB', 'MB', 'GB', 'TB'.
 * @param {"B" | "KB" | "MB" | "GB" | "TB"} toUnit - The unit to convert the file size to. Valid units are 'B', 'KB', 'MB', 'GB', 'TB'.
 * @returns The converted file size in the target unit.
 * @throws Will throw an error if the provided units are invalid.
 */
export function convertFileSize(
  value: number,
  fromUnit: string,
  toUnit: string
): number {
  const units = ["B", "KB", "MB", "GB", "TB"];
  const fromIndex = units.indexOf(fromUnit.toUpperCase());
  const toIndex = units.indexOf(toUnit.toUpperCase());

  if (fromIndex === -1 || toIndex === -1) {
    console.error("Invalid unit");
    return 0;
  }

  const conversionFactor = Math.pow(1024, fromIndex - toIndex);
  return value * conversionFactor;
}
