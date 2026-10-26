"use client";

import { useState, type ComponentProps, type ReactNode } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "./button";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./command";
import { Spinner } from "@/components/shared/feedback";
import { cn } from "@/lib/utils";

type ComboboxOption = { value: string; label: string; disabled?: boolean };
type ComboboxProps<T extends ComboboxOption> = Omit<
  ComponentProps<typeof Button>,
  "value" | "onChange"
> & {
  value?: string;
  onChange: (value: string | undefined) => void;
  options: T[];
  placeholder?: string;
  clearable?: boolean;
  creatable?: boolean;
  search?: string;
  onSearchChange?: (search: string) => void;
  loading?: boolean;
  emptyText?: string;
  renderOption?: (option: T) => ReactNode;
};

export function Combobox<T extends ComboboxOption>({
  value,
  onChange,
  options,
  placeholder = "Select an option",
  clearable,
  creatable,
  search: controlledSearch,
  onSearchChange,
  loading,
  emptyText = "No results found",
  renderOption,
  className,
  ...props
}: ComboboxProps<T>) {
  const [open, setOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState("");
  const search = controlledSearch ?? localSearch;
  const setSearch = (next: string) => {
    if (onSearchChange) onSearchChange(next);
    else setLocalSearch(next);
  };
  const selected = options.find((option) => option.value === value);
  const choose = (next: string | undefined) => {
    onChange(next);
    setSearch("");
    setOpen(false);
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          {...props}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full min-w-0 justify-between px-3 font-normal", className)}
        >
          <span className="min-w-0 truncate">
            {selected ? (renderOption?.(selected) ?? selected.label) : value || placeholder}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="z-[1100] w-[var(--radix-popover-trigger-width)] p-0">
        <Command shouldFilter={!onSearchChange}>
          <CommandInput
            aria-label={props.title || "Search options"}
            placeholder={props.title || "Search..."}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList onWheel={(event) => event.stopPropagation()}>
            {loading ? (
              <div className="p-4">
                <Spinner />
              </div>
            ) : (
              <CommandEmpty>{emptyText}</CommandEmpty>
            )}
            <CommandGroup>
              {clearable && value && !search && (
                <CommandItem value="__clear" onSelect={() => choose(undefined)}>
                  Clear selection
                </CommandItem>
              )}
              {creatable &&
                search.trim() &&
                !options.some(
                  (option) => option.label.toLowerCase() === search.trim().toLowerCase(),
                ) && (
                  <CommandItem
                    value={search}
                    onSelect={() => choose(search.trim().split(",").filter(Boolean).pop())}
                  >
                    Use &quot;{search.trim()}&quot;
                  </CommandItem>
                )}
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  keywords={[option.label]}
                  disabled={option.disabled}
                  onSelect={() => choose(option.value)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {renderOption?.(option) ?? option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
