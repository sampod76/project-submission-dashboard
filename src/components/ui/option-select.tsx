"use client";

import type { ComponentProps } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";

type OptionSelectProps<T extends string> = Omit<
  ComponentProps<typeof SelectTrigger>,
  "value" | "onChange"
> & {
  value?: T;
  options: { value: T; label: string; disabled?: boolean }[];
  placeholder?: string;
} & (
    | { clearable: true; onChange: (value: T | undefined) => void }
    | { clearable?: false; onChange: (value: T) => void }
  );

export function OptionSelect<T extends string>({
  value,
  onChange,
  options,
  placeholder,
  clearable,
  disabled,
  ...props
}: OptionSelectProps<T>) {
  return (
    <Select
      value={value || "__empty"}
      disabled={disabled}
      onValueChange={(next) => {
        const option = options.find((option) => option.value === next);
        if (option) onChange(option.value);
        else if (clearable) onChange(undefined);
      }}
    >
      <SelectTrigger {...props}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="z-[1100]">
        <SelectItem value="__empty" disabled={!clearable}>
          {placeholder || "Select an option"}
        </SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
