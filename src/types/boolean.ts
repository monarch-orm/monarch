import { MonarchParseError } from "../errors";
import { MonarchType } from "./type";

export const boolean = () => new MonarchBoolean();

export class MonarchBoolean extends MonarchType<boolean, boolean> {
  constructor() {
    super((input) => {
      if (typeof input === "boolean") return input;
      throw new MonarchParseError("expected boolean", input);
    });
  }
}
