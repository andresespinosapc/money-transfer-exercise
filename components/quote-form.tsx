"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CURRENCIES } from "@/lib/constants";

export type QuoteFormData = {
  sourceCurrency: string;
  targetCurrency: string;
  sourceAmount: number;
};

type Props = {
  onSubmit: (data: QuoteFormData) => void;
  isLoading: boolean;
  error?: string;
};

export function QuoteForm({ onSubmit, isLoading, error }: Props) {
  const [sourceCurrency, setSourceCurrency] = useState("USD");
  const [targetCurrency, setTargetCurrency] = useState("EUR");
  const [sourceAmount, setSourceAmount] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseFloat(sourceAmount);
    if (isNaN(amount) || amount <= 0) return;
    onSubmit({ sourceCurrency, targetCurrency, sourceAmount: amount });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transfer Details</CardTitle>
        <CardDescription>
          Enter the amount and currencies for your transfer
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sourceAmount">You send</Label>
            <div className="flex gap-2">
              <Input
                id="sourceAmount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="1000.00"
                value={sourceAmount}
                onChange={(e) => setSourceAmount(e.target.value)}
                required
                className="flex-1"
              />
              <Select value={sourceCurrency} onValueChange={setSourceCurrency}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>They receive</Label>
            <Select value={targetCurrency} onValueChange={setTargetCurrency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Calculating..." : "Get Quote"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
