import { Building2 } from "lucide-react";
import { useOrg } from "@/contexts/OrgContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function OrgSwitcher() {
  const { companies, activeCompany, setActiveCompanyId, loading } = useOrg();

  if (loading || companies.length === 0) return null;

  // Single company: show a static chip (no need to switch).
  if (companies.length === 1) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Building2 className="h-4 w-4" />
        <span className="max-w-[180px] truncate">{activeCompany?.name}</span>
      </div>
    );
  }

  return (
    <Select value={activeCompany?.id ?? undefined} onValueChange={setActiveCompanyId}>
      <SelectTrigger className="h-9 w-[220px]">
        <Building2 className="mr-2 h-4 w-4 shrink-0" />
        <SelectValue placeholder="Selecionar empresa" />
      </SelectTrigger>
      <SelectContent>
        {companies.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            {c.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
