import {IParser} from "import-sort-parser";
import {IStyle} from "import-sort-style";

export interface ICodeChange {
  start: number;
  end: number;
  code: string;
  note?: string;
}
export interface ISortResult {
  code: string;
  changes: ICodeChange[];
}
export default function importSort(
  code: string,
  rawParser: string | IParser,
  rawStyle: string | IStyle,
  file?: string,
  options?: object,
): ISortResult;
export declare function sortImports(
  code: string,
  parser: IParser,
  style: IStyle,
  file?: string,
  options?: object,
): ISortResult;
export declare function applyChanges(
  code: string,
  changes: ICodeChange[],
): string;
// # sourceMappingURL=index.d.ts.map
