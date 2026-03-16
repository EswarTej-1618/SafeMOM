import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { PregnancyOrder } from "@/data/patients";

export interface NewMotherFormData {
  name: string;
  email: string;
}

interface AddNewMotherDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: NewMotherFormData) => void;
  isLoading?: boolean;
}

const defaultForm: NewMotherFormData = {
  name: "",
  email: "",
};

export function AddNewMotherDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: AddNewMotherDialogProps) {
  const [form, setForm] = useState<NewMotherFormData>(defaultForm);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) return;
    onSubmit(form);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) setForm(defaultForm);
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Mother</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mother-name">Name</Label>
            <Input
              id="mother-name"
              placeholder="Full name"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mother-email">Email Address</Label>
            <Input
              id="mother-email"
              type="email"
              placeholder="e.g. mother@example.com"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              required
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0 mt-6">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Linking..." : "Link Patient"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
