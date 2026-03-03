"use client";

import { useState } from "react";
import { QuoteForm, type QuoteFormData } from "@/components/quote-form";
import { QuoteResult, type QuotePreview } from "@/components/quote-result";
import { trpc } from "@/lib/trpc";
import { useRouter } from "next/navigation";

export default function NewQuotePage() {
  const [preview, setPreview] = useState<QuotePreview | null>(null);
  const [formData, setFormData] = useState<QuoteFormData | null>(null);
  const router = useRouter();

  const calculate = trpc.quote.calculate.useMutation({
    onSuccess: (data) => {
      setPreview(data);
    },
  });

  const save = trpc.quote.save.useMutation({
    onSuccess: () => {
      router.push("/dashboard");
    },
  });

  function handleCalculate(data: QuoteFormData) {
    setFormData(data);
    setPreview(null);
    calculate.mutate({
      sourceCurrency: data.sourceCurrency,
      targetCurrency: data.targetCurrency,
      sourceAmount: data.sourceAmount,
    });
  }

  function handleSave() {
    if (!formData) return;
    save.mutate({
      sourceCurrency: formData.sourceCurrency,
      targetCurrency: formData.targetCurrency,
      sourceAmount: formData.sourceAmount,
    });
  }

  function handleReset() {
    setPreview(null);
    setFormData(null);
    calculate.reset();
    save.reset();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Get a Quote</h1>
      <div className="grid gap-6 md:grid-cols-2">
        <QuoteForm
          onSubmit={handleCalculate}
          isLoading={calculate.isPending}
          error={calculate.error?.message}
        />
        {preview && (
          <QuoteResult
            preview={preview}
            onSave={handleSave}
            onReset={handleReset}
            isSaving={save.isPending}
            saveError={save.error?.message}
          />
        )}
      </div>
    </div>
  );
}
