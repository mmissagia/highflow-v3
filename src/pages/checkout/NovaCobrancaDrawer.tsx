import { useState, useMemo, useEffect, useRef } from "react";
import { format } from "date-fns";
import { CalendarIcon, Plus, Trash2, Check, Copy, MessageCircle, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import LeadComboboxWithCreate from "@/components/LeadComboboxWithCreate";
import LeadInlineCreateForm, { type ValidState } from "@/components/LeadInlineCreateForm";
import useUnifiedLeads from "@/hooks/useUnifiedLeads";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getPublicAppUrl } from "@/config/appUrl";

const mockProducts = [
  "Mentoria Elite",
  "Mastermind Premium",
  "Consultoria 1:1",
  "Imersão Presencial",
];

const initialsFromName = (n: string) =>
  n
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

type PaymentLineType = "pix" | "cartao" | "tmb";

interface PaymentLine {
  id: string;
  type: PaymentLineType;
  value: number;
  installments: number;
  firstDue: string;
}

interface InvoiceResult {
  linkId: string;
  clientName: string;
  clientEmail: string;
  value: number;
  description: string;
  paymentMethods: ("pix" | "cartao" | "tmb")[];
  closerName: string;
  closerInitials: string;
  dueDate: string;
}

const formatCurrency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });

export function NovaCobrancaDrawer({
  open,
  onOpenChange,
  onInvoiceCreated,
  prefilledLead,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onInvoiceCreated: (inv: InvoiceResult) => void;
  prefilledLead?: { name: string; email: string; phone?: string; pipelineValue: number };
}) {
  const [step, setStep] = useState<"form" | "confirmation">("form");
  const [mode, setMode] = useState<"arranged" | "flexible">("arranged");
  const [selectedLeadId, setSelectedLeadId] = useState("");
  const [product, setProduct] = useState("");
  const [customProduct, setCustomProduct] = useState("");
  const [totalValue, setTotalValue] = useState(0);
  const [discountEnabled, setDiscountEnabled] = useState(false);
  const [discountType, setDiscountType] = useState<"percent" | "fixed">("percent");
  const [discountValue, setDiscountValue] = useState(0);
  const [couponCode, setCouponCode] = useState("");
  const [paymentLines, setPaymentLines] = useState<PaymentLine[]>([]);

  // Flexible mode config
  const [flexMinAmount, setFlexMinAmount] = useState<number>(0);
  const [flexMethods, setFlexMethods] = useState<{ pix: boolean; cartao: boolean; tmb: boolean }>({ pix: true, cartao: true, tmb: false });
  const [flexCartaoMax, setFlexCartaoMax] = useState<number>(12);
  const [flexTmbMax, setFlexTmbMax] = useState<number>(12);
  const [flexInstruction, setFlexInstruction] = useState<string>("");

  const [closerId, setCloserId] = useState<string>("");
  const [dueDate, setDueDate] = useState<Date>();
  const [notes, setNotes] = useState("");
  const [generatedLink, setGeneratedLink] = useState("");
  const [confirmedClientName, setConfirmedClientName] = useState("");

  // Inline lead creation state
  const [inlineDraftOpen, setInlineDraftOpen] = useState(false);
  const [inlineQuery, setInlineQuery] = useState("");
  const [inlineDraftState, setInlineDraftState] = useState<ValidState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Unified leads (used for prefill matching and preview card)
  const { leads: unifiedLeads } = useUnifiedLeads();

  // Sales users from Supabase (closers / leaders)
  const [salesUsers, setSalesUsers] = useState<Array<{ id: string; name: string; role: string }>>([]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("sales_users")
        .select("id, name, role")
        .eq("status", "active")
        .order("name");
      if (!cancelled && data) setSalesUsers(data);
    })();
    return () => { cancelled = true; };
  }, []);

  // Prefill lead when prop provided
  useEffect(() => {
    if (open && prefilledLead) {
      const match = unifiedLeads.find(
        (l) => l.name === prefilledLead.name || l.email === prefilledLead.email
      );
      if (match) {
        setSelectedLeadId(match.id);
        setTotalValue(prefilledLead.pipelineValue);
      }
    }
  }, [open, prefilledLead, unifiedLeads]);

  const selectedLead = unifiedLeads.find((l) => l.id === selectedLeadId);
  const closer = useMemo(() => {
    const found = salesUsers.find((s) => s.id === closerId);
    if (!found) return null;
    return { id: found.id, name: found.name, initials: initialsFromName(found.name) };
  }, [salesUsers, closerId]);

  const discountAmount = useMemo(() => {
    if (!discountEnabled || discountValue <= 0) return 0;
    return discountType === "percent" ? (totalValue * discountValue) / 100 : discountValue;
  }, [discountEnabled, discountType, discountValue, totalValue]);

  const finalValue = totalValue - discountAmount;

  const paymentSum = paymentLines.reduce((s, l) => s + l.value, 0);
  const paymentDiff = finalValue - paymentSum;

  // === F13: Choreography do fechamento do arranjo ===
  // `remaining` = paymentDiff quando arranjo está sendo construído (faltante).
  // Considera-se "fechado" quando há linhas e |paymentDiff| <= 0.01.
  const remaining = paymentLines.length > 0 ? Math.max(0, paymentDiff) : 0;
  const isArrangementClosed =
    paymentLines.length > 0 && Math.abs(paymentDiff) <= 0.01;

  const [isClosing, setIsClosing] = useState(false);
  const [showZero, setShowZero] = useState(false);
  const previousRemaining = useRef<number | null>(null);

  useEffect(() => {
    const prev = previousRemaining.current;
    if (prev !== null && prev > 0 && remaining === 0 && isArrangementClosed) {
      setIsClosing(true);
      const t1 = setTimeout(() => setShowZero(true), 200);
      const t2 = setTimeout(() => setIsClosing(false), 1000);
      previousRemaining.current = remaining;
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
    if (remaining > 0) {
      setShowZero(false);
    }
    previousRemaining.current = remaining;
  }, [remaining, isArrangementClosed]);

  // === F13: micro-feedback WhatsApp ===
  const [whatsappSent, setWhatsappSent] = useState(false);
  const handleSendWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(generatedLink)}`, "_blank");
    setWhatsappSent(true);
    setTimeout(() => setWhatsappSent(false), 1000);
  };

  const addPaymentLine = () => {
    setPaymentLines((prev) => [
      ...prev,
      { id: crypto.randomUUID(), type: "pix", value: 0, installments: 1, firstDue: "" },
    ]);
  };

  const updateLine = (id: string, field: keyof PaymentLine, val: string | number) => {
    setPaymentLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, [field]: val } : l))
    );
  };

  const removeLine = (id: string) => {
    setPaymentLines((prev) => prev.filter((l) => l.id !== id));
  };

  const reset = () => {
    setStep("form");
    setMode("arranged");
    setSelectedLeadId("");
    setProduct("");
    setCustomProduct("");
    setTotalValue(0);
    setDiscountEnabled(false);
    setDiscountValue(0);
    setCouponCode("");
    setPaymentLines([]);
    setCloserId("");
    setDueDate(undefined);
    setNotes("");
    setGeneratedLink("");
    setConfirmedClientName("");
    setInlineDraftOpen(false);
    setInlineQuery("");
    setInlineDraftState(null);
    setFlexMinAmount(0);
    setFlexMethods({ pix: true, cartao: true, tmb: false });
    setFlexCartaoMax(12);
    setFlexTmbMax(12);
    setFlexInstruction("");
  };

  const finishWithInvoice = async (
    clientName: string,
    clientEmail: string,
    clientPhone?: string,
  ) => {
    if (!closer) return;
    const desc = product === "__custom" ? customProduct : product;
    const methods = [...new Set(paymentLines.map((l) => l.type))];
    const linkId = crypto.randomUUID().slice(0, 8);

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      toast.error("Sessão expirada. Faça login novamente.");
      return;
    }

    const allowedMethods = (Object.keys(flexMethods) as Array<keyof typeof flexMethods>).filter((k) => flexMethods[k]);
    const flexibleConfig =
      mode === "flexible"
        ? {
            min_amount_per_tx: flexMinAmount || Math.round(finalValue * 0.1),
            allowed_methods: allowedMethods,
            cartao_max_installments: flexCartaoMax,
            tmb_max_installments: flexTmbMax,
            instruction: flexInstruction || null,
          }
        : null;

    const { error } = await supabase.from("payment_links").insert({
      id: linkId,
      producer_id: userId,
      lead_name: clientName || "Cliente",
      lead_email: clientEmail || null,
      lead_phone: clientPhone || null,
      description: desc || "Cobrança avulsa",
      value: finalValue,
      payment_lines: (mode === "arranged"
        ? paymentLines.map((l) => ({ ...l, paid: false, paid_at: null }))
        : []) as unknown as never,
      mode,
      flexible_config: flexibleConfig as unknown as never,
      closer_name: closer.name,
      closer_initials: closer.initials,
      due_date: dueDate ? format(dueDate, "yyyy-MM-dd") : null,
      status: "pending",
    });

    if (error) {
      toast.error("Erro ao gerar link", { description: error.message });
      return;
    }

    const link = `${getPublicAppUrl()}/pay/${linkId}`;
    setGeneratedLink(link);
    setConfirmedClientName(clientName);

    if (mode === "flexible") {
      toast.success(`Link flexível gerado — saldo a pagar: ${formatCurrency(finalValue)}`);
    }

    onInvoiceCreated({
      linkId,
      clientName: clientName || "Cliente",
      clientEmail: clientEmail || "",
      value: finalValue,
      description: desc || "Cobrança avulsa",
      paymentMethods: methods.length > 0 ? methods : ["pix"],
      closerName: closer.name,
      closerInitials: closer.initials,
      dueDate: dueDate ? format(dueDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
    });
    setStep("confirmation");
  };

  const handleGenerate = async () => {
    if (!closer) {
      toast.error("Selecione um closer responsável");
      return;
    }

    // Caso 1: lead existente selecionado
    if (selectedLeadId && !inlineDraftOpen) {
      await finishWithInvoice(
        selectedLead?.name || "Cliente",
        selectedLead?.email || "",
        selectedLead?.phone || prefilledLead?.phone || undefined,
      );
      return;
    }

    // Caso 2: criação inline
    if (inlineDraftOpen) {
      if (!inlineDraftState?.isValid || !inlineDraftState.draft) {
        toast.error("Preencha os dados do novo lead");
        return;
      }
      setIsSubmitting(true);
      try {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.user?.id;
        if (!userId) {
          toast.error("Sessão expirada. Faça login novamente.");
          return;
        }
        const { data: newLead, error } = await supabase
          .from("manual_leads")
          .insert({
            user_id: userId,
            name: inlineDraftState.draft.name,
            email: inlineDraftState.draft.email,
            phone: inlineDraftState.draft.phone,
            closer_user_id: closer.id,
            origin: "Venda Direta",
            created_via: "checkout_ht",
            stage: "fechou",
            pipeline_value: totalValue || null,
            pitch: product === "__custom" ? customProduct : product || null,
          })
          .select()
          .single();

        if (error) {
          if (error.code === "23505") {
            toast.error("Lead já existe", {
              description: "Já existe lead com este email ou telefone. Selecione o lead existente.",
            });
          } else {
            toast.error("Erro ao criar lead", { description: error.message });
          }
          return;
        }

        await finishWithInvoice(newLead.name, newLead.email ?? "", newLead.phone ?? undefined);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const isSubmitDisabled =
    !closer ||
    !totalValue ||
    totalValue <= 0 ||
    isSubmitting ||
    (inlineDraftOpen ? !inlineDraftState?.isValid : !selectedLeadId) ||
    (mode === "flexible" && !Object.values(flexMethods).some(Boolean));

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="w-full sm:max-w-[500px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-xl">Nova Cobrança</SheetTitle>
          <SheetDescription>Fatura individualizada com arranjo de pagamento personalizado</SheetDescription>
        </SheetHeader>

        {step === "form" ? (
          <div className="mt-6 space-y-6">
            {/* Lead */}
            <div className="space-y-2">
              <Label>Lead vinculado</Label>
              {!inlineDraftOpen ? (
                <LeadComboboxWithCreate
                  value={selectedLeadId || null}
                  onSelect={(lead) => {
                    setSelectedLeadId(lead?.id ?? "");
                    if (lead?.pipeline_value) setTotalValue(lead.pipeline_value);
                  }}
                  onRequestCreate={(q) => {
                    setInlineQuery(q);
                    setInlineDraftOpen(true);
                    setSelectedLeadId("");
                  }}
                />
              ) : (
                <LeadInlineCreateForm
                  initialQuery={inlineQuery}
                  closerUserId={closer?.id ?? ""}
                  closerName={closer?.name ?? "—"}
                  pipelineValue={totalValue || null}
                  pitch={product === "__custom" ? customProduct : product}
                  onCancel={() => {
                    setInlineDraftOpen(false);
                    setInlineQuery("");
                    setInlineDraftState(null);
                  }}
                  onUseExisting={(lead) => {
                    setInlineDraftOpen(false);
                    setSelectedLeadId(lead.id);
                    setInlineDraftState(null);
                  }}
                  onValidChange={setInlineDraftState}
                />
              )}
              {selectedLead && !inlineDraftOpen && (
                <div className="rounded-md bg-muted/50 p-3 text-sm">
                  <p className="font-medium text-foreground">{selectedLead.name}</p>
                  <p className="text-muted-foreground">{selectedLead.email ?? selectedLead.phone ?? "—"}</p>
                  {selectedLead.pipeline_value != null && (
                    <p className="text-muted-foreground">Valor potencial: {formatCurrency(selectedLead.pipeline_value)}</p>
                  )}
                </div>
              )}
            </div>

            {/* Mode tabs */}
            <div className="space-y-2">
              <Label>Tipo de cobrança</Label>
              <Tabs value={mode} onValueChange={(v) => setMode(v as "arranged" | "flexible")}>
                <TabsList className="grid grid-cols-2 w-full">
                  <TabsTrigger value="arranged">Arranjo composto</TabsTrigger>
                  <TabsTrigger value="flexible">Pagamento flexível</TabsTrigger>
                </TabsList>
              </Tabs>
              <p className="text-xs text-muted-foreground">
                {mode === "arranged"
                  ? "Você define a sequência de pagamentos. O cliente paga em ordem."
                  : "O cliente decide quanto pagar agora e em qual meio, em uma ou mais transações."}
              </p>
            </div>

            {/* Product */}
            <div className="space-y-2">
              <Label>Produto / Descrição</Label>
              <Select value={product} onValueChange={setProduct}>
                <SelectTrigger><SelectValue placeholder="Selecione o produto..." /></SelectTrigger>
                <SelectContent>
                  {mockProducts.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                  <SelectItem value="__custom">Outro (texto livre)</SelectItem>
                </SelectContent>
              </Select>
              {product === "__custom" && (
                <Input
                  placeholder="Descreva o produto ou serviço"
                  value={customProduct}
                  onChange={(e) => setCustomProduct(e.target.value)}
                />
              )}
            </div>

            {/* Total value */}
            <div className="space-y-2">
              <Label>Valor total negociado (R$)</Label>
              <Input
                type="number"
                value={totalValue || ""}
                onChange={(e) => setTotalValue(Number(e.target.value))}
                placeholder="0"
              />
            </div>

            {/* Discount */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Aplicar desconto</Label>
                <Switch checked={discountEnabled} onCheckedChange={setDiscountEnabled} />
              </div>
              {discountEnabled && (
                <div className="space-y-3 rounded-md border border-border p-3">
                  <div className="flex gap-2">
                    <Select value={discountType} onValueChange={(v) => setDiscountType(v as "percent" | "fixed")}>
                      <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percent">Percentual (%)</SelectItem>
                        <SelectItem value="fixed">Valor fixo (R$)</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      value={discountValue || ""}
                      onChange={(e) => setDiscountValue(Number(e.target.value))}
                      placeholder="0"
                      className="flex-1"
                    />
                  </div>
                  <Input
                    placeholder="Código do cupom (opcional)"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                  />
                  {discountAmount > 0 && totalValue > 0 && (
                    <div className="rounded-md bg-emerald-500/10 p-2 text-sm">
                      <span className="text-muted-foreground line-through">{formatCurrency(totalValue)}</span>
                      {" → "}
                      <span className="font-semibold text-emerald-600">{formatCurrency(finalValue)}</span>
                      <span className="ml-1 text-muted-foreground">
                        ({discountType === "percent" ? `${discountValue}% off` : `${formatCurrency(discountAmount)} off`})
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Payment arrangement */}
            {mode === "arranged" ? (
            <div className="space-y-3">
              <Label>Arranjo de pagamento</Label>
              {paymentLines.map((line) => (
                <div key={line.id} className="space-y-2 rounded-md border border-border p-3">
                  <div className="flex items-center gap-2">
                    <Select value={line.type} onValueChange={(v) => updateLine(line.id, "type", v)}>
                      <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pix">🟢 Pix</SelectItem>
                        <SelectItem value="cartao">💳 Cartão Z2Pay</SelectItem>
                        <SelectItem value="tmb">📄 Boleto TMB</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      placeholder="Valor (R$)"
                      value={line.value || ""}
                      onChange={(e) => updateLine(line.id, "value", Number(e.target.value))}
                      className="flex-1"
                    />
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeLine(line.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                  {(line.type === "cartao" || line.type === "tmb") && (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs">Parcelas</Label>
                        <Input
                          type="number"
                          min={1}
                          max={12}
                          value={line.installments}
                          onChange={(e) => updateLine(line.id, "installments", Number(e.target.value))}
                        />
                      </div>
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs">1ª parcela</Label>
                        <Input
                          type="date"
                          value={line.firstDue}
                          onChange={(e) => updateLine(line.id, "firstDue", e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                  {line.type === "cartao" && (
                    <p className="text-[11px] text-muted-foreground">
                      Processado via <span className="font-semibold" style={{ color: "#7C3AED" }}>Z2Pay</span> — taxas diferenciadas para high ticket
                    </p>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addPaymentLine} className="w-full">
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Adicionar meio de pagamento
              </Button>
              {paymentLines.length > 0 && (
                <div
                  className={cn(
                    "rounded-md p-2 text-sm",
                    isClosing && "animate-[arrangement-container-breath_300ms_var(--ease-glide)_500ms]",
                    isArrangementClosed
                      ? "bg-emerald-500/10 text-emerald-600"
                      : paymentDiff > 0
                        ? "bg-red-500/10 text-red-600"
                        : "bg-red-500/10 text-red-600"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs uppercase tracking-wider opacity-70">
                      {isArrangementClosed ? "Arranjo completo" : "Valor restante"}
                    </span>
                    <span
                      className={cn(
                        "text-base font-semibold tabular-nums inline-block",
                        isClosing && !showZero && "animate-[arrangement-value-out_200ms_var(--ease-soften)_forwards]",
                        isClosing && showZero && "animate-[arrangement-value-in_400ms_var(--ease-spring)] origin-center"
                      )}
                    >
                      {isArrangementClosed || showZero
                        ? formatCurrency(paymentSum)
                        : paymentDiff > 0
                          ? `Faltam ${formatCurrency(paymentDiff)}`
                          : `Excede ${formatCurrency(Math.abs(paymentDiff))}`}
                    </span>
                  </div>
                  {isArrangementClosed && (
                    <div className="mt-1 flex items-center gap-1.5 text-xs">
                      <Check className="h-3.5 w-3.5 shrink-0" />
                      Arranjo completo — pronto para gerar link
                    </div>
                  )}
                  {!isArrangementClosed && paymentDiff < 0 && (
                    <div className="mt-1 flex items-center gap-1.5 text-xs">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      Excede o valor total
                    </div>
                  )}
                </div>
              )}
            </div>
            ) : (
            <div className="space-y-3 rounded-md border border-border p-3">
              <Label>Configuração do pagamento flexível</Label>
              <div className="space-y-1">
                <Label className="text-xs">Valor mínimo por transação (R$)</Label>
                <Input
                  type="number"
                  value={flexMinAmount || ""}
                  placeholder={String(Math.round((finalValue || 0) * 0.1))}
                  onChange={(e) => setFlexMinAmount(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Meios aceitos</Label>
                <div className="flex flex-wrap gap-3">
                  {([
                    { key: "pix" as const, label: "🟢 Pix" },
                    { key: "cartao" as const, label: "💳 Cartão Z2Pay" },
                    { key: "tmb" as const, label: "📄 Boleto TMB" },
                  ]).map((m) => (
                    <label key={m.key} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={flexMethods[m.key]}
                        onCheckedChange={(v) => setFlexMethods((s) => ({ ...s, [m.key]: !!v }))}
                      />
                      {m.label}
                    </label>
                  ))}
                </div>
              </div>
              {flexMethods.cartao && (
                <div className="space-y-1">
                  <Label className="text-xs">Cartão — máx parcelas</Label>
                  <Select value={String(flexCartaoMax)} onValueChange={(v) => setFlexCartaoMax(Number(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                        <SelectItem key={n} value={String(n)}>{n}x</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {flexMethods.tmb && (
                <div className="space-y-1">
                  <Label className="text-xs">TMB — máx parcelas</Label>
                  <Select value={String(flexTmbMax)} onValueChange={(v) => setFlexTmbMax(Number(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                        <SelectItem key={n} value={String(n)}>{n}x</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1">
                <Label className="text-xs">Instrução ao cliente (opcional)</Label>
                <Textarea
                  rows={2}
                  maxLength={200}
                  placeholder="Ex: Pague o que puder agora; saldo será cobrado em até 30 dias."
                  value={flexInstruction}
                  onChange={(e) => setFlexInstruction(e.target.value)}
                />
              </div>
            </div>
            )}

            {/* Closer */}
            <div className="space-y-2">
              <Label>Closer responsável</Label>
              <Select value={closerId} onValueChange={setCloserId}>
                <SelectTrigger><SelectValue placeholder="Selecione o closer..." /></SelectTrigger>
                <SelectContent>
                  {salesUsers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Due date */}
            <div className="space-y-2">
              <Label>Vencimento</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !dueDate && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "dd/MM/yyyy") : "Selecione a data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                placeholder="Notas internas sobre esta cobrança..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button
                className={cn(
                  "flex-1 transition-opacity duration-default ease-glide",
                  isClosing && "animate-[arrangement-cta-wake_200ms_var(--ease-emerge)_800ms_forwards]"
                )}
                onClick={handleGenerate}
                disabled={isSubmitDisabled}
              >
                {isSubmitting ? "Gerando..." : "Gerar Link de Pagamento"}
              </Button>
              <Button variant="outline" onClick={() => handleClose(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          /* Confirmation step */
          <div className="mt-6 space-y-6">
            <div className="flex flex-col items-center gap-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 animate-[success-check-in_400ms_var(--ease-spring)]">
                <Check className="h-6 w-6 text-emerald-600" />
              </div>
              <div className="animate-[insertion-enter_300ms_var(--ease-emerge)_400ms_both]">
                <p className="text-lg font-semibold text-foreground">Link gerado com sucesso!</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Cobrança de {formatCurrency(finalValue)} para {confirmedClientName || selectedLead?.name}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Link de pagamento</Label>
              <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 p-3">
                <code className="flex-1 truncate text-sm text-foreground">{generatedLink}</code>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                onClick={() => navigator.clipboard.writeText(generatedLink)}
              >
                <Copy className="mr-2 h-4 w-4" /> Copiar Link
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleSendWhatsApp}
              >
                {whatsappSent ? (
                  <Check className="mr-2 h-4 w-4 animate-[whatsapp-confirm_400ms_var(--ease-spring)]" />
                ) : (
                  <MessageCircle className="mr-2 h-4 w-4" />
                )}
                {whatsappSent ? "Enviado" : "Enviar via WhatsApp"}
              </Button>
            </div>

            <Button variant="outline" className="w-full" onClick={() => handleClose(false)}>
              Fechar
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
