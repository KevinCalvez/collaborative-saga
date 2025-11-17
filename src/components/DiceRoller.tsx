import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dices } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dice3D } from "./Dice3D";

interface DiceRollerProps {
  onRoll: (result: string) => void;
  disabled?: boolean;
}

export const DiceRoller = ({ onRoll, disabled }: DiceRollerProps) => {
  const [open, setOpen] = useState(false);
  const [diceType, setDiceType] = useState("6");
  const [diceCount, setDiceCount] = useState("1");
  const [modifier, setModifier] = useState("0");
  const [lastResult, setLastResult] = useState<{ rolls: number[]; total: number; } | null>(null);
  const [isRolling, setIsRolling] = useState(false);

  const diceTypes = [
    { value: "4", label: "d4" },
    { value: "6", label: "d6" },
    { value: "8", label: "d8" },
    { value: "10", label: "d10" },
    { value: "12", label: "d12" },
    { value: "20", label: "d20" },
    { value: "100", label: "d100" },
  ];

  useEffect(() => {
    if (isRolling) {
      const timer = setTimeout(() => {
        setIsRolling(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isRolling]);

  const rollDice = () => {
    const count = parseInt(diceCount) || 1;
    const sides = parseInt(diceType) || 6;
    const mod = parseInt(modifier) || 0;

    if (count < 1 || count > 20) {
      return;
    }

    setIsRolling(true);

    const rolls: number[] = [];
    for (let i = 0; i < count; i++) {
      rolls.push(Math.floor(Math.random() * sides) + 1);
    }

    const sum = rolls.reduce((a, b) => a + b, 0);
    const total = sum + mod;

    setLastResult({ rolls, total });

    // Format du message
    const rollsText = rolls.join(", ");
    const modText = mod !== 0 ? ` ${mod >= 0 ? '+' : ''}${mod}` : '';
    const resultMessage = `🎲 Lance ${count}d${sides}${modText}: [${rollsText}]${modText ? ` (${sum}${modText})` : ''} = **${total}**`;

    setTimeout(() => {
      onRoll(resultMessage);
      setIsRolling(false);
      setOpen(false);
    }, 2000);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          disabled={disabled}
          className="gap-2"
        >
          <Dices className="h-4 w-4" />
          Dés
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Lancer les dés</DialogTitle>
          <DialogDescription>
            Choisis le type et le nombre de dés à lancer
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {lastResult && (
            <>
              <Dice3D rolls={lastResult.rolls} isRolling={isRolling} />
              
              <div className="p-4 rounded-lg bg-accent/20 border border-accent">
                <div className="flex items-center gap-2 mb-2">
                  <Dices className="h-5 w-5 text-accent" />
                  <span className="font-semibold text-foreground">Résultat</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {lastResult.rolls.map((roll, i) => (
                    <Badge key={i} variant="secondary" className="text-lg px-3 py-1">
                      {roll}
                    </Badge>
                  ))}
                </div>
                <div className="mt-2 text-2xl font-bold text-accent">
                  Total: {lastResult.total}
                </div>
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label>Nombre de dés</Label>
            <Input
              type="number"
              min="1"
              max="20"
              value={diceCount}
              onChange={(e) => setDiceCount(e.target.value)}
              placeholder="1"
            />
          </div>

          <div className="space-y-2">
            <Label>Type de dé</Label>
            <Select value={diceType} onValueChange={setDiceType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {diceTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Modificateur</Label>
            <Input
              type="number"
              value={modifier}
              onChange={(e) => setModifier(e.target.value)}
              placeholder="0"
            />
          </div>

          <Button
            onClick={rollDice}
            className="w-full bg-accent text-accent-foreground hover:shadow-[var(--shadow-glow)]"
            disabled={isRolling}
          >
            <Dices className="mr-2 h-4 w-4" />
            {isRolling ? "Lancement en cours..." : `Lancer ${diceCount}d${diceType}${parseInt(modifier) !== 0 ? ` ${parseInt(modifier) >= 0 ? '+' : ''}${modifier}` : ''}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
