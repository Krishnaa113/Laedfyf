import { Schema } from "mongoose";

export function objectIdRef(
  model: string,
  options: { required?: boolean; index?: boolean } = {},
) {
  const required = options.required ?? false;
  const index = options.index ?? true;

  return {
    type: Schema.Types.ObjectId,
    ref: model,
    required,
    default: required ? undefined : null,
    index,
  };
}

export function objectIdRefList(model: string) {
  return [
    {
      type: Schema.Types.ObjectId,
      ref: model,
    },
  ];
}
