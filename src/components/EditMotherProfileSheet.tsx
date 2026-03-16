import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CHRONIC_CONDITIONS,
  saveMotherProfile,
  type MotherSignupProfile,
  type ProfileVitals,
} from "@/data/motherProfiles";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

interface EditMotherProfileSheetProps {
  initialData: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: any) => Promise<void> | void;
}

export function EditMotherProfileSheet({
  initialData,
  open,
  onOpenChange,
  onSave,
}: EditMotherProfileSheetProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    name: initialData?.name || "",
    age: initialData?.age ? String(initialData.age) : "",
    bloodGroup: initialData?.bloodGroup || "",
    gestationWeek: initialData?.gestationWeek ? String(initialData.gestationWeek) : "",
    pregnancyNumber: initialData?.pregnancyNumber ? String(initialData.pregnancyNumber) : "1",
    chronicConditions: (initialData?.chronicConditions || []).slice(),
    otherCondition: initialData?.otherCondition || "",
    onMedication: !!initialData?.onMedication,
    medicationNames: initialData?.medicationNames || "",
    weightKg: initialData?.vitals?.weightKg != null ? String(initialData.vitals.weightKg) : "",
    bloodPressureSystolic: initialData?.vitals?.bloodPressureSystolic != null ? String(initialData.vitals.bloodPressureSystolic) : "",
    bloodPressureDiastolic: initialData?.vitals?.bloodPressureDiastolic != null ? String(initialData.vitals.bloodPressureDiastolic) : "",
    hemoglobin: initialData?.vitals?.hemoglobin != null ? String(initialData.vitals.hemoglobin) : "",
    bloodSugarMgDl: initialData?.vitals?.bloodSugarMgDl != null ? String(initialData.vitals.bloodSugarMgDl) : "",
    heartRateBpm: initialData?.vitals?.heartRateBpm != null ? String(initialData.vitals.heartRateBpm) : "",
    spo2Percent: initialData?.vitals?.spo2Percent != null ? String(initialData.vitals.spo2Percent) : "",
  });

  useEffect(() => {
    if (open) {
      setForm({
        name: initialData?.name || "",
        age: initialData?.age ? String(initialData.age) : "",
        bloodGroup: initialData?.bloodGroup || "",
        gestationWeek: initialData?.gestationWeek ? String(initialData.gestationWeek) : "",
        pregnancyNumber: initialData?.pregnancyNumber ? String(initialData.pregnancyNumber) : "1",
        chronicConditions: (initialData?.chronicConditions || []).slice(),
        otherCondition: initialData?.otherCondition || "",
        onMedication: !!initialData?.onMedication,
        medicationNames: initialData?.medicationNames || "",
        weightKg: initialData?.vitals?.weightKg != null ? String(initialData.vitals.weightKg) : "",
        bloodPressureSystolic: initialData?.vitals?.bloodPressureSystolic != null ? String(initialData.vitals.bloodPressureSystolic) : "",
        bloodPressureDiastolic: initialData?.vitals?.bloodPressureDiastolic != null ? String(initialData.vitals.bloodPressureDiastolic) : "",
        hemoglobin: initialData?.vitals?.hemoglobin != null ? String(initialData.vitals.hemoglobin) : "",
        bloodSugarMgDl: initialData?.vitals?.bloodSugarMgDl != null ? String(initialData.vitals.bloodSugarMgDl) : "",
        heartRateBpm: initialData?.vitals?.heartRateBpm != null ? String(initialData.vitals.heartRateBpm) : "",
        spo2Percent: initialData?.vitals?.spo2Percent != null ? String(initialData.vitals.spo2Percent) : "",
      });
    }
  }, [open, initialData]);

  const toggleCondition = (label: string) => {
    setForm((p) => ({
      ...p,
      chronicConditions: p.chronicConditions.includes(label)
        ? p.chronicConditions.filter((c) => c !== label)
        : [...p.chronicConditions, label],
    }));
  };

  const handleSave = async () => {
    const age = Number(form.age) || 0;
    const gestationWeek = Number(form.gestationWeek) || 0;
    const pregnancyNumber = Number(form.pregnancyNumber) || 1;
    const vitals: ProfileVitals = {};
    if (form.weightKg.trim() !== "") vitals.weightKg = Number(form.weightKg);
    if (form.bloodPressureSystolic.trim() !== "") vitals.bloodPressureSystolic = Number(form.bloodPressureSystolic);
    if (form.bloodPressureDiastolic.trim() !== "") vitals.bloodPressureDiastolic = Number(form.bloodPressureDiastolic);
    if (form.hemoglobin.trim() !== "") vitals.hemoglobin = Number(form.hemoglobin);
    if (form.bloodSugarMgDl.trim() !== "") vitals.bloodSugarMgDl = Number(form.bloodSugarMgDl);
    if (form.heartRateBpm.trim() !== "") vitals.heartRateBpm = Number(form.heartRateBpm);
    if (form.spo2Percent.trim() !== "") vitals.spo2Percent = Number(form.spo2Percent);

    const updated = {
      ...initialData,
      name: form.name.trim() || initialData?.name,
      age: age || initialData?.age,
      bloodGroup: form.bloodGroup || initialData?.bloodGroup,
      gestationWeek: gestationWeek || initialData?.gestationWeek,
      pregnancyNumber: pregnancyNumber || initialData?.pregnancyNumber,
      chronicConditions: form.chronicConditions,
      otherCondition: form.otherCondition.trim(),
      onMedication: form.onMedication,
      medicationNames: form.onMedication ? form.medicationNames.trim() : "",
      vitals: Object.keys(vitals).length > 0 ? vitals : undefined,
    };

    setIsSaving(true);
    try {
      await onSave(updated);
      onOpenChange(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-lg sm:max-w-xl overflow-hidden flex flex-col p-0">
        <SheetHeader className="p-4 border-b border-border">
          <SheetTitle>Edit profile</SheetTitle>
        </SheetHeader>
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-6">
            {/* Personal */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Personal info</h3>
              <div className="grid gap-2">
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Full name" />
              </div>
              <div className="grid gap-2">
                <Label>Email (read-only)</Label>
                <Input value={initialData?.email || ""} disabled className="bg-muted" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-1">
                  <Label>Age</Label>
                  <Input type="number" min={15} max={50} value={form.age} onChange={(e) => setForm((p) => ({ ...p, age: e.target.value }))} />
                </div>
                <div className="grid gap-1">
                  <Label>Blood group</Label>
                  <select
                    value={form.bloodGroup}
                    onChange={(e) => setForm((p) => ({ ...p, bloodGroup: e.target.value }))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select</option>
                    {BLOOD_GROUPS.map((bg) => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-1">
                  <Label>Gestation (weeks)</Label>
                  <Input type="number" min={1} max={42} value={form.gestationWeek} onChange={(e) => setForm((p) => ({ ...p, gestationWeek: e.target.value }))} />
                </div>
                <div className="grid gap-1">
                  <Label>Pregnancy number</Label>
                  <select
                    value={form.pregnancyNumber}
                    onChange={(e) => setForm((p) => ({ ...p, pregnancyNumber: e.target.value }))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="1">1st</option>
                    <option value="2">2nd</option>
                    <option value="3">3rd or more</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Vitals */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Health vitals (optional)</h3>
              <p className="text-xs text-muted-foreground">Enter or update your latest readings. These are also used for your personal health report.</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-1">
                  <Label>Weight (kg)</Label>
                  <Input type="number" placeholder="e.g. 62" value={form.weightKg} onChange={(e) => setForm((p) => ({ ...p, weightKg: e.target.value }))} />
                </div>
                <div className="grid gap-1">
                  <Label>BP Systolic</Label>
                  <Input type="number" placeholder="e.g. 120" value={form.bloodPressureSystolic} onChange={(e) => setForm((p) => ({ ...p, bloodPressureSystolic: e.target.value }))} />
                </div>
                <div className="grid gap-1">
                  <Label>BP Diastolic</Label>
                  <Input type="number" placeholder="e.g. 80" value={form.bloodPressureDiastolic} onChange={(e) => setForm((p) => ({ ...p, bloodPressureDiastolic: e.target.value }))} />
                </div>
                <div className="grid gap-1">
                  <Label>Hemoglobin (g/dL)</Label>
                  <Input type="number" placeholder="e.g. 11" value={form.hemoglobin} onChange={(e) => setForm((p) => ({ ...p, hemoglobin: e.target.value }))} />
                </div>
                <div className="grid gap-1">
                  <Label>Blood sugar (mg/dL)</Label>
                  <Input type="number" placeholder="e.g. 95" value={form.bloodSugarMgDl} onChange={(e) => setForm((p) => ({ ...p, bloodSugarMgDl: e.target.value }))} />
                </div>
                <div className="grid gap-1">
                  <Label>Heart rate (bpm)</Label>
                  <Input type="number" placeholder="e.g. 78" value={form.heartRateBpm} onChange={(e) => setForm((p) => ({ ...p, heartRateBpm: e.target.value }))} />
                </div>
                <div className="grid gap-1">
                  <Label>SpO₂ (%)</Label>
                  <Input type="number" placeholder="e.g. 98" value={form.spo2Percent} onChange={(e) => setForm((p) => ({ ...p, spo2Percent: e.target.value }))} />
                </div>
              </div>
            </div>

            {/* Chronic conditions */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Chronic conditions</h3>
              <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                {CHRONIC_CONDITIONS.map((label) => (
                  <label key={label} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={form.chronicConditions.includes(label)} onCheckedChange={() => toggleCondition(label)} />
                    {label}
                  </label>
                ))}
              </div>
              <div className="grid gap-1">
                <Label>Other</Label>
                <Input value={form.otherCondition} onChange={(e) => setForm((p) => ({ ...p, otherCondition: e.target.value }))} placeholder="Other condition" />
              </div>
            </div>

            {/* Medication */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Medication</h3>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="med" checked={!form.onMedication} onChange={() => setForm((p) => ({ ...p, onMedication: false, medicationNames: "" }))} className="rounded-full" />
                  No
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="med" checked={form.onMedication} onChange={() => setForm((p) => ({ ...p, onMedication: true }))} className="rounded-full" />
                  Yes
                </label>
              </div>
              {form.onMedication && (
                <div className="grid gap-1">
                  <Label>Medication names</Label>
                  <Textarea value={form.medicationNames} onChange={(e) => setForm((p) => ({ ...p, medicationNames: e.target.value }))} placeholder="e.g. Folic acid, Iron" className="min-h-[80px]" />
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
        <div className="p-4 border-t border-border flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
