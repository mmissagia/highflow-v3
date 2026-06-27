import { useState } from "react";
import { Check, Copy, Download, MessageCircle, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { toast } from "sonner";
import { getPublicAppUrl } from "@/config/appUrl";

const mockProducts = [
  "Mentoria Elite",
  "Mastermind Premium",
  "Consultoria 1:1",
  "Imersão Presencial",
];

const formatCurrency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });

interface LinkResult {
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

export function NovoLinkProdutoDrawer({
  open,
  onOpenChange,
  onLinkCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onLinkCreated: (inv: LinkResult) => void;
}) {
  const { activeCompanyId } = useOrg();
  const [step, setStep] = useState<"form" | "result">("form");
  const [product, setProduct] = useState("");
  const [offerName, setOfferName] = useState("");
  const [value, setValue] = useState(0);
  const [pixEnabled, setPixEnabled] = useState(true);
  const [pixDiscount, setPixDiscount] = useState(5);
  const [cartaoEnabled, setCartaoEnabled] = useState(true);
  const [cartaoMaxInstallments, setCartaoMaxInstallments] = useState(12);
  const [tmbEnabled, setTmbEnabled] = useState(false);
  const [tmbMaxInstallments, setTmbMaxInstallments] = useState(6);
  const [couponCode, setCouponCode] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponType, setCouponType] = useState<"percent" | "fixed">("percent");
  const [couponExpiry, setCouponExpiry] = useState("");
  const [generatedLink, setGeneratedLink] = useState("");

  const reset = () => {
    setStep("form");
    setProduct("");
    setOfferName("");
    setValue(0);
    setPixEnabled(true);
    setPixDiscount(5);
    setCartaoEnabled(true);
    setCartaoMaxInstallments(12);
    setTmbEnabled(false);
    setTmbMaxInstallments(6);
    setCouponCode("");
    setCouponDiscount(0);
    setCouponExpiry("");
    setGeneratedLink("");
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const handleGenerate = async () => {
    const methods: ("pix" | "cartao" | "tmb")[] = [];
    if (pixEnabled) methods.push("pix");
    if (cartaoEnabled) methods.push("cartao");
    if (tmbEnabled) methods.push("tmb");

    const paymentLines: Array<{
      id: string;
      type: "pix" | "cartao" | "tmb";
      value: number;
      installments: number;
    }> = [];
    if (pixEnabled) paymentLines.push({ id: crypto.randomUUID(), type: "pix", value, installments: 1 });
    if (cartaoEnabled) paymentLines.push({ id: crypto.randomUUID(), type: "cartao", value, installments: cartaoMaxInstallments });
    if (tmbEnabled) paymentLines.push({ id: crypto.randomUUID(), type: "tmb", value, installments: tmbMaxInstallments });

    const linkId = crypto.randomUUID().slice(0, 8);
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      toast.error("Sessão expirada. Faça login novamente.");
      return;
    }

    const { error } = await supabase.from("payment_links").insert({
      id: linkId,
      producer_id: userId,
      org_id: activeCompanyId!,
      lead_name: "Cliente (link de produto)",
      description: offerName || product,
      value,
      payment_lines: paymentLines as unknown as never,
      due_date: format(new Date(), "yyyy-MM-dd"),
      status: "pending",
    });

    if (error) {
      toast.error("Erro ao gerar link", { description: error.message });
      return;
    }

    const link = `${getPublicAppUrl()}/pay/${linkId}`;
    setGeneratedLink(link);

    onLinkCreated({
      linkId,
      clientName: "Link de Produto",
      clientEmail: offerName || product,
      value,
      description: product || "Produto",
      paymentMethods: methods.length > 0 ? methods : ["pix"],
      closerName: "—",
      closerInitials: "LP",
      dueDate: format(new Date(), "yyyy-MM-dd"),
    });

    setStep("result");
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="w-full sm:max-w-[500px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-xl">Novo Link de Produto</SheetTitle>
          <SheetDescription>Crie uma oferta com link de pagamento compartilhável.</SheetDescription>
        </SheetHeader>

        {step === "form" ? (
          <div className="mt-6 space-y-6">
            {/* Product */}
            <div className="space-y-2">
              <Label>Produto</Label>
              <Select value={product} onValueChange={setProduct}>
                <SelectTrigger><SelectValue placeholder="Selecione o produto..." /></SelectTrigger>
                <SelectContent>
                  {mockProducts.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Offer name */}
            <div className="space-y-2">
              <Label>Nome da oferta</Label>
              <Input
                placeholder="Ex: Mentoria Elite — Turma Março 2026"
                value={offerName}
                onChange={(e) => setOfferName(e.target.value)}
              />
            </div>

            {/* Value */}
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                value={value || ""}
                onChange={(e) => setValue(Number(e.target.value))}
                placeholder="0"
              />
            </div>

            {/* Payment conditions */}
            <div className="space-y-3">
              <Label>Condições de pagamento disponíveis</Label>

              <div className="space-y-3 rounded-md border border-border p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox checked={pixEnabled} onCheckedChange={(v) => setPixEnabled(!!v)} id="pix" />
                    <label htmlFor="pix" className="text-sm font-medium cursor-pointer">🟢 Pix</label>
                  </div>
                  {pixEnabled && (
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        value={pixDiscount || ""}
                        onChange={(e) => setPixDiscount(Number(e.target.value))}
                        className="w-16 h-8 text-xs"
                      />
                      <span className="text-xs text-muted-foreground">% desc.</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox checked={cartaoEnabled} onCheckedChange={(v) => setCartaoEnabled(!!v)} id="cartao" />
                    <label htmlFor="cartao" className="text-sm font-medium cursor-pointer">💳 Cartão via Z2Pay</label>
                  </div>
                  {cartaoEnabled && (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">até</span>
                      <Input
                        type="number"
                        value={cartaoMaxInstallments}
                        onChange={(e) => setCartaoMaxInstallments(Number(e.target.value))}
                        className="w-14 h-8 text-xs"
                        min={1}
                        max={12}
                      />
                      <span className="text-xs text-muted-foreground">x</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox checked={tmbEnabled} onCheckedChange={(v) => setTmbEnabled(!!v)} id="tmb" />
                    <label htmlFor="tmb" className="text-sm font-medium cursor-pointer">📄 Boleto TMB</label>
                  </div>
                  {tmbEnabled && (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">até</span>
                      <Input
                        type="number"
                        value={tmbMaxInstallments}
                        onChange={(e) => setTmbMaxInstallments(Number(e.target.value))}
                        className="w-14 h-8 text-xs"
                        min={1}
                        max={12}
                      />
                      <span className="text-xs text-muted-foreground">x</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Coupon */}
            <div className="space-y-3">
              <Label>Cupom de desconto</Label>
              <div className="space-y-2 rounded-md border border-border p-3">
                <Input
                  placeholder="Código do cupom (ex: TURMA10)"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                />
                <div className="flex gap-2">
                  <Select value={couponType} onValueChange={(v) => setCouponType(v as "percent" | "fixed")}>
                    <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">Percentual (%)</SelectItem>
                      <SelectItem value="fixed">Valor fixo (R$)</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    placeholder="Desconto"
                    value={couponDiscount || ""}
                    onChange={(e) => setCouponDiscount(Number(e.target.value))}
                    className="flex-1"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Validade</Label>
                  <Input
                    type="date"
                    value={couponExpiry}
                    onChange={(e) => setCouponExpiry(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button className="flex-1" onClick={handleGenerate} disabled={!product || value <= 0}>
                Gerar Link + QR Code
              </Button>
              <Button variant="outline" onClick={() => handleClose(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          /* Result */
          <div className="mt-6 space-y-6">
            <div className="flex flex-col items-center gap-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20">
                <Check className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-lg font-semibold text-foreground">Link de produto criado!</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {offerName || product} — {formatCurrency(value)}
                </p>
              </div>
            </div>

            {/* QR Code placeholder */}
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-48 w-48 items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30">
                <div className="text-center">
                  <QrCode className="mx-auto h-16 w-16 text-muted-foreground/50" />
                  <p className="mt-2 text-xs text-muted-foreground">QR Code</p>
                </div>
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
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" /> Baixar QR Code
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(generatedLink)}`, "_blank")}
              >
                <MessageCircle className="mr-2 h-4 w-4" /> Compartilhar via WhatsApp
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
