export interface LibraryFile {
  filePath: string;
  fileName: string;
  showTitle: string;
  size: number;
  sizeFormatted: string;
  modifiedAt: string;
}

export interface SeriesGroup {
  title: string;
  files: LibraryFile[];
  totalSize: number;
  latestDate: string;
}
