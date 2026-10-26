"use client";
import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import DoctorFilters, { type DoctorFilterValuesProps } from "./doctor-filters";
type DoctorFilterDrawerProps = {
  open: boolean;
  onClose: () => void;
  filters: DoctorFilterValuesProps;
};
export default function DoctorFilterDrawer({ open, onClose, filters }: DoctorFilterDrawerProps) {
  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <SheetContent
        side="bottom"
        aria-describedby={undefined}
        className="flex flex-col rounded-t-2xl"
        style={{ height: "min(560px, 90dvh)" }}
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Filter /> Filter Doctors
          </SheetTitle>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <DoctorFilters mode="mobile" {...filters} />
        </div>
        <SheetFooter className="grid grid-cols-2 gap-3 pb-[max(12px,env(safe-area-inset-bottom))]">
          <Button variant="secondary" size="lg" onClick={filters.resetFilters}>
            Reset
          </Button>
          <Button size="lg" className="bg-orange-500 hover:bg-orange-600" onClick={onClose}>
            Apply Filters
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
