import { useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { INDUSTRY_SECTORS } from "@/lib/industrySectors";

interface IndustrySectorSelectProps {
  selectedSectors: string[];
  onSectorsChange: (sectors: string[]) => void;
  disabled?: boolean;
}

export function IndustrySectorSelect({
  selectedSectors,
  onSectorsChange,
  disabled = false,
}: IndustrySectorSelectProps) {
  const [open, setOpen] = useState(false);

  const handleToggle = (value: string) => {
    if (selectedSectors.includes(value)) {
      onSectorsChange(selectedSectors.filter((s) => s !== value));
    } else {
      onSectorsChange([...selectedSectors, value]);
    }
  };

  const handleRemove = (value: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onSectorsChange(selectedSectors.filter((s) => s !== value));
  };

  const getLabel = (value: string) => {
    return INDUSTRY_SECTORS.find((s) => s.value === value)?.label ?? value;
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">Áreas de Atuação</Label>
      <p className="text-xs text-muted-foreground mb-2">
        Selecione as áreas em que a organização atua
      </p>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="w-full justify-between min-h-10 h-auto py-2"
          >
            <div className="flex flex-wrap gap-1 flex-1">
              {selectedSectors.length === 0 ? (
                <span className="text-muted-foreground">Selecionar áreas...</span>
              ) : (
                selectedSectors.map((value) => (
                  <Badge
                    key={value}
                    variant="secondary"
                    className="mr-1 mb-1"
                  >
                    {getLabel(value)}
                    <button
                      type="button"
                      className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={(e) => handleRemove(value, e)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))
              )}
            </div>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0 bg-popover" align="start">
          <Command>
            <CommandInput placeholder="Pesquisar áreas..." />
            <CommandList>
              <CommandEmpty>Nenhuma área encontrada.</CommandEmpty>
              <CommandGroup>
                {INDUSTRY_SECTORS.map((sector) => (
                  <CommandItem
                    key={sector.value}
                    value={sector.label}
                    onSelect={() => handleToggle(sector.value)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedSectors.includes(sector.value)
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    {sector.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {selectedSectors.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {selectedSectors.length} área(s) selecionada(s)
        </p>
      )}
    </div>
  );
}
