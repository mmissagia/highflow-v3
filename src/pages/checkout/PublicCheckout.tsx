import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Lock, Shield, AlertCircle, Check, Pencil, Loader2, Copy, Zap, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type PayType = "pix" | "cartao" | "tmb";

interface PaymentLine {
  id: string;
  type: PayType;
  value: number;
  installments: number;
  firstDue?: string;
  paid?: boolean;
  paid_at?: string | null;
}

interface FlexibleConfig {
  min_amount_per_tx: number;
  allowed_methods: PayType[];
  cartao_max_installments: number;
  tmb_max_installments: number;
  instruction?: string | null;
}

interface Transaction {
  id: string;
  method: PayType;
  value: number;
  installments: number;
  status: string;
  paid_at: string;
}

interface PaymentLinkRow {
  id: string;
  lead_name: string;
  description: string;
  value: number;
  payment_lines: PaymentLine[];
  closer_name: string | null;
  closer_initials: string | null;
  closer_role: string | null;
  status: "pending" | "partial" | "paid" | "expired" | "cancelled";
  paid_method: string | null;
  mode: "arranged" | "flexible";
  flexible_config: FlexibleConfig | null;
  transactions: Transaction[];
  paid_amount: number;
}

const formatCurrency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

const COMMON_FEMALE_NAMES = ["ana","maria","beatriz","clara","sofia","sophia","julia","júlia","leticia","letícia","larissa","fernanda","carla","patricia","patrícia","adriana","renata","vanessa","marta","helena","isabel","catarina","rita","camila","juliana","amanda","bianca","gabriela","mariana","carolina","carol","bruna","aline","raquel","priscila","tatiana","luana","luiza","luísa","luisa","manuela","alice","laura","valentina","heloisa","heloísa","cecilia","cecília","yasmin","melissa","natalia","natália"];
const FEMALE_ENDINGS = ["a","e"];
function isLikelyFemale(firstName: string): boolean {
  const lower = firstName.trim().toLowerCase();
  if (!lower) return false;
  if (COMMON_FEMALE_NAMES.includes(lower)) return true;
  const last = lower.slice(-1);
  return FEMALE_ENDINGS.includes(last) && !lower.endsWith("é");
}

const methodLabel: Record<PayType, string> = {
  pix: "Pix",
  cartao: "Cartão Z2Pay",
  tmb: "Boleto TMB",
};

const methodIcon: Record<PayType, string> = {
  pix: "🟢",
  cartao: "💳",
  tmb: "📄",
};

const maskCpf = (v: string) =>
  v.replace(/\D/g, "").slice(0, 11)
   .replace(/(\d{3})(\d)/, "$1.$2")
   .replace(/(\d{3})(\d)/, "$1.$2")
   .replace(/(\d{3})(\d{1,2})$/, "$1-$2");

const maskPhone = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").trim().replace(/-$/, "");
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").trim().replace(/-$/, "");
};

function HighFlowMark() {
  return (
    <div className="flex items-center justify-center gap-2 py-6">
      <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600" />
      <span className="text-lg font-semibold tracking-tight text-foreground">HighFlow</span>
    </div>
  );
}

function PageFooter() {
  return (
    <div className="mt-6 space-y-2 text-center text-xs text-muted-foreground">
      <p>
        Pagamento processado por{" "}
        <span style={{ color: "#7C3AED" }} className="font-semibold">Z2Pay</span> — TMB — PIX
      </p>
      <div className="flex items-center justify-center gap-3">
        <span className="inline-flex items-center gap-1"><Lock className="h-3 w-3" /> SSL</span>
        <span className="inline-flex items-center gap-1"><Shield className="h-3 w-3" /> Ambiente seguro</span>
      </div>
    </div>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto max-w-[560px] px-4 py-8 space-y-4">
        <HighFlowMark />
        {children}
        <PageFooter />
      </div>
    </div>
  );
}

function StateCard({ icon, title, hint }: { icon: React.ReactNode; title: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-8 text-center shadow-sm">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        {icon}
      </div>
      <p className="text-base font-semibold text-foreground">{title}</p>
      {hint && <p className="mt-2 text-sm text-muted-foreground">{hint}</p>}
    </div>
  );
}

function QuittanceCard({
  data,
  email,
  totalUnits,
  unitSingular,
  unitPlural,
  lines,
}: {
  data: PaymentLinkRow;
  email: string;
  totalUnits: number;
  unitSingular: string;
  unitPlural: string;
  lines?: PaymentLine[];
}) {
  const firstName = (data.lead_name?.trim().split(/\s+/)[0]) || "Cliente";
  const female = isLikelyFemale(firstName);
  const desc = (data.description || "").trim();
  const isAvulsa = !desc || desc.toLowerCase() === "cobrança avulsa";
  const showLines = !!lines && lines.length > 1;
  return (
    <Card className="border-emerald-500/30 bg-emerald-500/5">
      <CardContent className="space-y-5 p-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
          <Check className="h-8 w-8 text-emerald-600" strokeWidth={2.5} />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">
            Bem-vind{female ? "a" : "o"}, {firstName}.
          </h2>
          {isAvulsa ? (
            <p className="text-base text-foreground/80">Seu pagamento foi confirmado.</p>
          ) : (
            <p className="text-base text-foreground/80">
              Sua vaga em <span className="font-semibold">{desc}</span> está garantida.
            </p>
          )}
          <p className="pt-1 text-sm text-muted-foreground">
            {formatCurrency(Number(data.value))} pagos em {totalUnits} {totalUnits === 1 ? unitSingular : unitPlural}.
          </p>
        </div>
        <Separator className="my-2" />
        {showLines && (
          <div className="space-y-2 text-left">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Resumo da fatura
            </p>
            {lines!.map((line, i) => (
              <div key={line.id} className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Etapa {i + 1} — {methodLabel[line.type]}
                </span>
                <span className="tabular-nums font-medium">{formatCurrency(Number(line.value))}</span>
              </div>
            ))}
          </div>
        )}
        {email && (
          <div className="mt-4 rounded-md border border-border bg-background/60 p-4 text-left">
            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="space-y-1">
                <p className="text-xs font-semibold text-foreground">Próximos passos</p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Em instantes você receberá em{" "}
                  <span className="font-medium text-foreground break-all">{email}</span> um e-mail
                  com os detalhes da sua compra e instruções de acesso.
                </p>
              </div>
            </div>
          </div>
        )}
        {data.closer_name && (
          <p className="pt-2 text-xs italic text-muted-foreground">
            Atendimento conduzido por {data.closer_name}.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

interface CustomerData { name: string; cpf: string; email: string; phone: string }

function CustomerCard({
  data, onChange, prefilled,
}: {
  data: CustomerData;
  onChange: (v: CustomerData) => void;
  prefilled: { name: boolean; email: boolean; phone: boolean };
}) {
  const [editing, setEditing] = useState<Record<string, boolean>>({});
  const lock = (k: keyof typeof prefilled) => prefilled[k] && !editing[k];
  const editBtn = (k: string) => (
    <button
      type="button"
      className="text-xs text-muted-foreground hover:text-foreground"
      onClick={() => setEditing((s) => ({ ...s, [k]: true }))}
    >
      <Pencil className="inline h-3 w-3" /> editar
    </button>
  );
  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <h3 className="text-sm font-semibold">Seus dados</h3>
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label>Nome completo</Label>
            {prefilled.name && !editing.name && editBtn("name")}
          </div>
          <Input
            value={data.name}
            readOnly={lock("name")}
            className={cn(lock("name") && "bg-muted/40")}
            onChange={(e) => onChange({ ...data, name: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label>CPF</Label>
          <Input
            value={data.cpf}
            placeholder="000.000.000-00"
            onChange={(e) => onChange({ ...data, cpf: maskCpf(e.target.value) })}
          />
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label>E-mail</Label>
            {prefilled.email && !editing.email && editBtn("email")}
          </div>
          <Input
            type="email"
            value={data.email}
            readOnly={lock("email")}
            className={cn(lock("email") && "bg-muted/40")}
            onChange={(e) => onChange({ ...data, email: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label>Celular</Label>
            {prefilled.phone && !editing.phone && editBtn("phone")}
          </div>
          <Input
            value={data.phone}
            readOnly={lock("phone")}
            className={cn(lock("phone") && "bg-muted/40")}
            onChange={(e) => onChange({ ...data, phone: maskPhone(e.target.value) })}
          />
        </div>
      </CardContent>
    </Card>
  );
}

const Z2CART_MOCK_CARDS = [
  { id: "card_1", brand: "visa", last4: "4242", expiry: "12/28" },
  { id: "card_2", brand: "mastercard", last4: "8901", expiry: "09/27" },
];

function Z2CartCardFields({
  leadName, isPaying, submitLabel, onSubmit,
}: {
  leadName: string;
  isPaying: boolean;
  submitLabel: string;
  onSubmit: () => void;
}) {
  const [phase, setPhase] = useState<"loading" | "ready">("loading");
  const [mode, setMode] = useState<"z2cart" | "manual">("z2cart");
  const [selectedId, setSelectedId] = useState<string>(Z2CART_MOCK_CARDS[0].id);
  const [cvv, setCvv] = useState("");
  const [manual, setManual] = useState({ number: "", expiry: "", cvv: "", name: "" });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPhase("loading");
    const t = setTimeout(() => setPhase("ready"), 300);
    return () => clearTimeout(t);
  }, []);

  const holder = (leadName || "").toUpperCase();
  const selected = Z2CART_MOCK_CARDS.find((c) => c.id === selectedId) ?? Z2CART_MOCK_CARDS[0];

  const handleSubmit = () => {
    const cvvValue = mode === "z2cart" ? cvv : manual.cvv;
    if (!cvvValue.trim()) { setError("CVV obrigatório"); return; }
    setError(null);
    onSubmit();
  };

  if (phase === "loading") {
    return (
      <div className="rounded-md border border-border bg-muted/30 p-4 h-[120px] flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Buscando seus cartões salvos...
      </div>
    );
  }

  if (mode === "manual") {
    return (
      <div className="space-y-3">
        <div className="space-y-1">
          <Label>Número do cartão</Label>
          <Input value={manual.number} onChange={(e) => setManual({ ...manual, number: e.target.value })} placeholder="0000 0000 0000 0000" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Validade</Label>
            <Input value={manual.expiry} onChange={(e) => setManual({ ...manual, expiry: e.target.value })} placeholder="MM/AA" />
          </div>
          <div className="space-y-1">
            <Label>CVV</Label>
            <Input value={manual.cvv} onChange={(e) => { setManual({ ...manual, cvv: e.target.value }); if (error) setError(null); }} placeholder="000" />
          </div>
        </div>
        <div className="space-y-1">
          <Label>Nome impresso no cartão</Label>
          <Input value={manual.name} onChange={(e) => setManual({ ...manual, name: e.target.value })} />
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button
          type="button"
          className="text-xs text-muted-foreground underline-offset-4 hover:underline"
          onClick={() => { setMode("z2cart"); setSelectedId(Z2CART_MOCK_CARDS[0].id); setError(null); }}
        >
          ← Voltar para meus cartões salvos
        </button>
        <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" disabled={isPaying} onClick={handleSubmit}>
          {isPaying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {submitLabel}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        className="flex items-center gap-2 rounded-md px-3 py-2"
        style={{ backgroundColor: "#7C3AED15", borderLeft: "3px solid #7C3AED" }}
      >
        <Zap className="h-4 w-4" style={{ color: "#7C3AED" }} />
        <div className="text-xs">
          <span className="font-semibold" style={{ color: "#7C3AED" }}>Z2Cart</span>
          <span className="text-muted-foreground"> — Cartões recuperados automaticamente</span>
        </div>
      </div>

      <div className="space-y-2">
        {Z2CART_MOCK_CARDS.map((c) => {
          const isSel = c.id === selectedId;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedId(c.id)}
              className={cn(
                "w-full flex items-center gap-3 rounded-md p-3 text-left transition",
                isSel ? "border-2" : "border border-border hover:border-muted-foreground/40",
              )}
              style={isSel ? { borderColor: "#7C3AED", backgroundColor: "#7C3AED14" } : undefined}
            >
              <span
                className="h-4 w-4 rounded-full border flex items-center justify-center"
                style={isSel ? { borderColor: "#7C3AED" } : undefined}
              >
                {isSel && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "#7C3AED" }} />}
              </span>
              <span
                className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white"
                style={{ backgroundColor: c.brand === "visa" ? "#1A1F71" : "#EB001B" }}
              >
                {c.brand}
              </span>
              <span className="font-mono text-sm">•••• •••• •••• {c.last4}</span>
              <span className="ml-auto text-xs text-muted-foreground tabular-nums">{c.expiry}</span>
            </button>
          );
        })}
      </div>

      <div className="space-y-3 pt-1">
        <div className="space-y-1">
          <Label>Número do cartão</Label>
          <div className="relative">
            <Input readOnly value={`•••• •••• •••• ${selected.last4}`} className="bg-muted/40 font-mono pr-9" />
            <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Validade</Label>
            <Input readOnly value={selected.expiry} className="bg-muted/40" />
          </div>
          <div className="space-y-1">
            <Label>CVV</Label>
            <Input
              value={cvv}
              onChange={(e) => { setCvv(e.target.value.replace(/\D/g, "").slice(0, 4)); if (error) setError(null); }}
              placeholder="000"
              inputMode="numeric"
            />
            <p className="text-[11px] text-muted-foreground">Por segurança, o CVV nunca é armazenado.</p>
          </div>
        </div>
        <div className="space-y-1">
          <Label>Nome impresso</Label>
          <Input readOnly value={holder} className="bg-muted/40" />
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>

      <button
        type="button"
        className="text-xs text-muted-foreground underline-offset-4 hover:underline"
        onClick={() => { setMode("manual"); setError(null); }}
      >
        Usar outro cartão
      </button>

      <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" disabled={isPaying} onClick={handleSubmit}>
        {isPaying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {submitLabel}
      </Button>
    </div>
  );
}

function PixBlock({
  amount, isPaying, onPay,
}: { amount: number; isPaying: boolean; onPay: () => void }) {
  const [code] = useState(() => Array.from({ length: 80 }, () => "abcdef0123456789"[Math.floor(Math.random() * 16)]).join(""));
  const filled = new Set([0,2,3,5,7,8,11,14,17,19,22,25,28,31,33,36,39,42,45,48,51,54,57,60,63]);
  return (
    <div className="space-y-3">
      <div className="flex flex-col items-center gap-2 py-2">
        <div className="relative flex h-[220px] w-[220px] items-center justify-center rounded-lg border-2 border-border bg-white">
          <div className="grid h-full w-full grid-cols-8 gap-[2px] p-3">
            {Array.from({ length: 64 }).map((_, i) => (
              <div key={i} className={cn("aspect-square", filled.has(i) ? "bg-black" : "bg-transparent")} />
            ))}
          </div>
          <div className="absolute left-2 top-2 h-8 w-8 rounded-sm border-4 border-black bg-white" />
          <div className="absolute right-2 top-2 h-8 w-8 rounded-sm border-4 border-black bg-white" />
          <div className="absolute bottom-2 left-2 h-8 w-8 rounded-sm border-4 border-black bg-white" />
        </div>
        <p className="font-mono text-[10px] text-muted-foreground">QR PIX MOCK</p>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Copia e cola Pix</Label>
        <div className="flex gap-2">
          <Input readOnly value={code} className="font-mono text-xs" />
          <Button type="button" variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(code); toast.success("Copiado"); }}>
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Após pagar, clique no botão abaixo para confirmar.</p>
      <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" disabled={isPaying} onClick={onPay}>
        {isPaying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Já paguei {formatCurrency(amount)}
      </Button>
    </div>
  );
}

function MethodFormBody({
  type, value, installments, isPaying, onPay, leadName,
}: {
  type: PayType; value: number; installments: number; isPaying: boolean; onPay: () => void; leadName: string;
}) {
  const installmentValue = value / Math.max(1, installments);
  const [tmbTermsAccepted, setTmbTermsAccepted] = useState(false);
  if (type === "pix") return <PixBlock amount={value} isPaying={isPaying} onPay={onPay} />;
  if (type === "cartao") {
    return (
      <div className="space-y-4">
        <div className="rounded-md bg-muted/50 p-3 text-sm">
          <p className="font-medium">{installments}x {formatCurrency(installmentValue)}</p>
          <p className="text-xs text-muted-foreground">Total {formatCurrency(value)}</p>
        </div>
        <Z2CartCardFields
          leadName={leadName}
          isPaying={isPaying}
          submitLabel={`Pagar ${formatCurrency(value)}`}
          onSubmit={onPay}
        />
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <div className="rounded-md bg-muted/50 p-3 text-sm">
        <p className="font-medium">{installments}x {formatCurrency(installmentValue)}</p>
        <p className="text-xs text-muted-foreground">Boleto financiado via TMB — análise rápida</p>
      </div>
      <div className="flex items-start gap-2 rounded-md border border-border bg-muted/30 p-3">
        <Checkbox
          id={`tmb-terms-${value}`}
          checked={tmbTermsAccepted}
          onCheckedChange={(v) => setTmbTermsAccepted(!!v)}
          className="mt-0.5"
        />
        <label htmlFor={`tmb-terms-${value}`} className="cursor-pointer text-xs leading-relaxed">
          Li e concordo com os <a href="#" className="underline">termos do financiamento via TMB</a>,
          incluindo as condições de parcelamento, taxa de juros, política de cobrança e
          consequências em caso de inadimplência.
        </label>
      </div>
      <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" disabled={isPaying || !tmbTermsAccepted} onClick={onPay}>
        {isPaying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Gerar boletos {formatCurrency(value)}
      </Button>
    </div>
  );
}

export default function PublicCheckout() {
  const { linkId } = useParams<{ linkId: string }>();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PaymentLinkRow | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [customer, setCustomer] = useState<CustomerData>({ name: "", cpf: "", email: "", phone: "" });
  const [singleFormDialogOpen, setSingleFormDialogOpen] = useState(false);
  const [overrideLine, setOverrideLine] = useState<PaymentLine | null>(null);
  const [isPaying, setIsPaying] = useState(false);
  const [openAccordionId, setOpenAccordionId] = useState<string | undefined>(undefined);

  // Flexible state
  const [flexAmount, setFlexAmount] = useState<number>(0);
  const [flexMethod, setFlexMethod] = useState<PayType>("pix");
  const [flexInstallments, setFlexInstallments] = useState<number>(1);

  const loadLink = async () => {
    if (!linkId) { setNotFound(true); setLoading(false); return; }
    const { data: rows, error } = await (supabase as any)
      .rpc("get_public_payment_link", { p_id: linkId });
    const row = Array.isArray(rows) ? rows[0] : rows;
    if (error || !row) { setNotFound(true); setLoading(false); return; }
    const r = row as unknown as PaymentLinkRow;
    setData(r);
    setCustomer((prev) => ({
      name: prev.name || (r.lead_name && r.lead_name !== "Cliente (link de produto)" && r.lead_name !== "Cliente" ? r.lead_name : ""),
      cpf: prev.cpf,
      email: prev.email,
      phone: prev.phone,
    }));
    if (r.mode === "flexible") {
      const remaining = Number(r.value) - Number(r.paid_amount);
      setFlexAmount(remaining);
      const allowed = r.flexible_config?.allowed_methods ?? ["pix"];
      setFlexMethod(allowed[0] ?? "pix");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadLink();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkId]);

  // ---- ARRANGED payment: confirm one line at a time ----
  const handleLineConfirm = async (lineId: string, method: PayType, lineValue: number) => {
    if (!data) return;
    setIsPaying(true);
    await new Promise((r) => setTimeout(r, 2000));
    const { data: ok, error } = await (supabase as any).rpc("mark_payment_line_paid", {
      p_id: data.id,
      p_line_id: lineId,
      p_method: method,
      p_customer_name: customer.name,
      p_customer_cpf: customer.cpf,
      p_customer_email: customer.email,
      p_customer_phone: customer.phone,
    });
    setIsPaying(false);
    if (error || !ok) { toast.error("Falha ao confirmar pagamento"); return; }
    toast.success(`Pagamento de ${formatCurrency(lineValue)} via ${methodLabel[method]} confirmado`);
    await loadLink();
    // auto-open next unpaid line
    setTimeout(() => {
      setData((curr) => {
        if (!curr) return curr;
        const next = (curr.payment_lines ?? []).find((l) => !l.paid);
        setOpenAccordionId(next?.id);
        return curr;
      });
    }, 0);
  };
  // override (single form) handler — confirms a synthetic single line
  const handleOverridePay = async (method: PayType) => {
    if (!data) return;
    setIsPaying(true);
    await new Promise((r) => setTimeout(r, 2000));
    const { data: ok, error } = await (supabase as any).rpc("mark_payment_link_paid", {
      p_id: data.id,
      p_method: method,
      p_customer_name: customer.name,
      p_customer_cpf: customer.cpf,
      p_customer_email: customer.email,
      p_customer_phone: customer.phone,
    });
    setIsPaying(false);
    if (!error && ok) setData({ ...data, status: "paid", paid_method: method });
    else toast.error("Falha ao confirmar pagamento");
  };

  // ---- FLEXIBLE payment (one transaction at a time) ----
  const handleFlexPay = async () => {
    if (!data) return;
    setIsPaying(true);
    await new Promise((r) => setTimeout(r, 2000));
    const { data: ok, error } = await (supabase as any).rpc("record_payment_link_transaction", {
      p_id: data.id,
      p_method: flexMethod,
      p_value: flexAmount,
      p_installments: flexMethod === "pix" ? 1 : flexInstallments,
      p_customer_name: customer.name,
      p_customer_cpf: customer.cpf,
      p_customer_email: customer.email,
      p_customer_phone: customer.phone,
    });
    setIsPaying(false);
    if (error || !ok) { toast.error("Falha ao confirmar pagamento"); return; }
    toast.success(`Pagamento de ${formatCurrency(flexAmount)} confirmado`);
    await loadLink();
  };

  if (loading) {
    return (
      <PageShell>
        <div className="rounded-2xl border border-border bg-background p-6 shadow-sm">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="mt-3 h-10 w-3/4" />
          <Skeleton className="mt-2 h-12 w-1/2" />
          <Skeleton className="mt-6 h-32 w-full" />
        </div>
      </PageShell>
    );
  }
  if (notFound || !data) {
    return (
      <PageShell>
        <StateCard icon={<AlertCircle className="h-6 w-6 text-muted-foreground" />} title="Link não encontrado ou expirado" hint="Se você espera receber um pagamento, peça um novo link ao responsável." />
      </PageShell>
    );
  }
  if (data.status === "expired") return <PageShell><StateCard icon={<AlertCircle className="h-6 w-6 text-muted-foreground" />} title="Este link expirou" /></PageShell>;
  if (data.status === "cancelled") return <PageShell><StateCard icon={<AlertCircle className="h-6 w-6 text-muted-foreground" />} title="Este link foi cancelado" /></PageShell>;

  const consultLabel = data.closer_role || "Consultor(a)";
  const prefilled = {
    name: !!data.lead_name && data.lead_name !== "Cliente" && data.lead_name !== "Cliente (link de produto)",
    email: false,
    phone: false,
  };

  // Fatura header card (common to both modes)
  const InvoiceHeader = (
    <Card>
      <CardContent className="p-6">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">FATURA · #{data.id}</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-foreground" style={{ fontFamily: "Plus Jakarta Sans, system-ui, sans-serif" }}>
          {data.description}
        </h2>
        <p className="mt-3 text-4xl font-bold tabular-nums text-foreground">
          {formatCurrency(Number(data.value))}
        </p>
        {data.closer_name && (
          <p className="mt-2 text-xs text-muted-foreground">
            {consultLabel}: {data.closer_name}
          </p>
        )}
      </CardContent>
    </Card>
  );

  // ============================ FLEXIBLE MODE ============================
  if (data.mode === "flexible") {
    const cfg = data.flexible_config ?? {
      min_amount_per_tx: 0, allowed_methods: ["pix"] as PayType[], cartao_max_installments: 12, tmb_max_installments: 12,
    };
    const remaining = Math.max(0, Number(data.value) - Number(data.paid_amount));
    const isPaid = data.status === "paid" || remaining <= 0.001;

    const flexError =
      flexAmount < cfg.min_amount_per_tx
        ? `Valor mínimo por transação: ${formatCurrency(cfg.min_amount_per_tx)}`
        : flexAmount > remaining
          ? `Valor máximo: ${formatCurrency(remaining)}`
          : null;

    const maxInst = flexMethod === "cartao" ? cfg.cartao_max_installments : flexMethod === "tmb" ? cfg.tmb_max_installments : 1;

    return (
      <PageShell>
        {InvoiceHeader}

        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-5 space-y-3">
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-muted-foreground">Total da fatura</span>
              <span className="font-semibold tabular-nums">{formatCurrency(Number(data.value))}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-muted-foreground">Pago até agora</span>
              <span className="font-semibold tabular-nums text-emerald-600">{formatCurrency(Number(data.paid_amount))}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-baseline">
              <span className="text-base font-semibold">Saldo a pagar</span>
              <span className={cn("text-2xl font-bold tabular-nums", remaining > 0 ? "text-foreground" : "text-emerald-600")}>
                {formatCurrency(remaining)}
              </span>
            </div>
            <Progress value={(Number(data.paid_amount) / Number(data.value)) * 100} className="h-1.5" />
            {cfg.instruction && (
              <p className="text-xs text-muted-foreground italic pt-2">💬 {cfg.instruction}</p>
            )}
          </CardContent>
        </Card>

        <CustomerCard data={customer} onChange={setCustomer} prefilled={prefilled} />

        {(data.transactions?.length ?? 0) > 0 && (
          <Card>
            <CardContent className="p-5 space-y-2">
              <h3 className="text-sm font-semibold">Histórico de pagamentos</h3>
              <div className="space-y-1.5 text-sm">
                {data.transactions.map((t) => (
                  <div key={t.id} className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2">
                      <span>{methodIcon[t.method]}</span>
                      <span className="font-medium tabular-nums">{formatCurrency(t.value)}</span>
                      <span className="text-muted-foreground">
                        via {methodLabel[t.method]}{t.installments > 1 ? ` ${t.installments}x` : ""}
                      </span>
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {new Date(t.paid_at).toLocaleDateString("pt-BR")} às {new Date(t.paid_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {isPaid ? (
          <QuittanceCard
            data={data}
            email={customer.email}
            totalUnits={data.transactions?.length ?? 0}
            unitSingular="transação"
            unitPlural="transações"
          />
        ) : (
          <Card>
            <CardContent className="p-5 space-y-4">
              <h3 className="text-sm font-semibold">Realizar novo pagamento</h3>

              <div className="space-y-1">
                <Label className="text-xs">Valor a pagar agora (R$)</Label>
                <Input
                  type="number"
                  value={flexAmount || ""}
                  onChange={(e) => setFlexAmount(Number(e.target.value))}
                />
                {flexError && <p className="text-xs text-red-600">{flexError}</p>}
                <p className="text-[11px] text-muted-foreground">
                  Mínimo {formatCurrency(cfg.min_amount_per_tx)} · Máximo {formatCurrency(remaining)}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Meio de pagamento</Label>
                <Tabs value={flexMethod} onValueChange={(v) => { setFlexMethod(v as PayType); setFlexInstallments(1); }}>
                  <TabsList
                    className="grid w-full"
                    style={{ gridTemplateColumns: `repeat(${cfg.allowed_methods.length}, minmax(0, 1fr))` }}
                  >
                    {cfg.allowed_methods.map((m) => (
                      <TabsTrigger key={m} value={m}>{methodIcon[m]} {methodLabel[m]}</TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </div>

              {(flexMethod === "cartao" || flexMethod === "tmb") && (
                <div className="space-y-1">
                  <Label className="text-xs">Parcelas</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={flexInstallments}
                    onChange={(e) => setFlexInstallments(Number(e.target.value))}
                  >
                    {Array.from({ length: maxInst }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>{n}x de {formatCurrency(flexAmount / n)}</option>
                    ))}
                  </select>
                </div>
              )}

              {flexMethod === "cartao" && (
                <Z2CartCardFields
                  leadName={customer.name || data.lead_name}
                  isPaying={isPaying}
                  submitLabel={`Pagar ${formatCurrency(flexAmount)}`}
                  onSubmit={() => { if (!flexError && flexAmount > 0) handleFlexPay(); }}
                />
              )}
              {flexMethod === "pix" && (
                <PixBlock amount={flexAmount} isPaying={isPaying} onPay={handleFlexPay} />
              )}

              {flexMethod === "tmb" && (
                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={!!flexError || isPaying || flexAmount <= 0}
                  onClick={handleFlexPay}
                >
                  {isPaying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Pagar {formatCurrency(flexAmount)}
                </Button>
              )}
              {(flexMethod === "pix" || flexMethod === "cartao") && flexError && (
                <p className="text-xs text-red-600 text-center">Ajuste o valor para continuar.</p>
              )}
            </CardContent>
          </Card>
        )}
      </PageShell>
    );
  }

  // ============================ ARRANGED MODE ============================
  const arrangedLines = data.payment_lines ?? [];
  const totalLines = arrangedLines.length;
  const paidLinesCount = arrangedLines.filter((l) => l.paid).length;
  const paidAmount = arrangedLines.filter((l) => l.paid).reduce((s, l) => s + Number(l.value), 0);
  const totalValue = Number(data.value);
  const remaining = Math.max(0, totalValue - paidAmount);

  if (data.status === "paid") {
    return (
      <PageShell>
        <QuittanceCard
          data={data}
          email={customer.email}
          totalUnits={totalLines || 1}
          unitSingular="etapa"
          unitPlural="etapas"
          lines={arrangedLines}
        />
      </PageShell>
    );
  }

  const lines = arrangedLines;
  const isComposite = lines.length >= 2;
  // ensure an accordion item is open on first render / after data reloads
  const desiredOpen = openAccordionId
    ?? lines.find((l) => !l.paid)?.id
    ?? lines[0]?.id;

  return (
    <PageShell>
      {InvoiceHeader}

      {isComposite && !overrideLine && (
        <Card className="border-violet-500/20 bg-violet-500/5">
          <CardContent className="p-4 text-sm">
            <p className="font-medium text-foreground">💡 Plano sugerido pelo Consultor</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {lines.map((l, i) => `${i === 0 ? "Entrada em" : "Saldo em"} ${methodLabel[l.type]}${l.installments > 1 ? ` ${l.installments}x` : ""}`).join(" → ")}
            </p>
          </CardContent>
        </Card>
      )}

      <CustomerCard data={customer} onChange={setCustomer} prefilled={prefilled} />

      {isComposite && !overrideLine && (
        <Card>
          <CardContent className="p-4">
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">Saldo desta fatura</span>
              <span className="text-xs text-muted-foreground">
                {paidLinesCount} de {totalLines} etapas pagas
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-bold tabular-nums">{formatCurrency(remaining)}</span>
              <span className="text-xs text-muted-foreground">de {formatCurrency(totalValue)}</span>
            </div>
            <Progress value={(paidAmount / Math.max(1, totalValue)) * 100} className="mt-2 h-1" />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-5">
          {overrideLine ? (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Pagar com {methodLabel[overrideLine.type]}</h3>
              <MethodFormBody
                type={overrideLine.type}
                value={overrideLine.value}
                installments={overrideLine.installments}
                isPaying={isPaying}
                onPay={() => handleOverridePay(overrideLine.type)}
                leadName={customer.name || data.lead_name}
              />
              <button
                className="text-xs text-muted-foreground underline-offset-4 hover:underline"
                onClick={() => setOverrideLine(null)}
                type="button"
              >
                ← voltar ao plano sugerido
              </button>
            </div>
          ) : !isComposite ? (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Pagar com {lines[0] ? methodLabel[lines[0].type] : "Pix"}</h3>
              {lines[0] && (
                <MethodFormBody
                  type={lines[0].type}
                  value={lines[0].value}
                  installments={lines[0].installments}
                  isPaying={isPaying}
                  onPay={() => handleLineConfirm(lines[0].id, lines[0].type, Number(lines[0].value))}
                  leadName={customer.name || data.lead_name}
                />
              )}
            </div>
          ) : (
            <>
              <Accordion
                type="single"
                collapsible
                value={desiredOpen}
                onValueChange={(v) => setOpenAccordionId(v || undefined)}
                className="space-y-2"
              >
                {lines.map((line, idx) => (
                  <AccordionItem
                    key={line.id}
                    value={line.id}
                    className={cn(
                      "rounded-md border px-3 transition-all",
                      line.paid
                        ? "animate-pulse-slow border-emerald-500/40"
                        : "border-border"
                    )}
                  >
                    <AccordionTrigger className="text-sm">
                      <div className="flex w-full items-center gap-2 pr-2">
                        <span className="text-xs text-muted-foreground">Etapa {idx + 1}</span>
                        <span>{methodIcon[line.type]} {methodLabel[line.type]}</span>
                        <span className="ml-auto text-sm font-semibold tabular-nums">
                          {formatCurrency(Number(line.value))}
                        </span>
                        {line.paid && (
                          <Badge className="gap-1 border-emerald-500/30 bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15">
                            <Check className="h-3 w-3" /> Pago
                          </Badge>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      {line.paid ? (
                        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm text-emerald-700">
                          <Check className="mr-1 inline h-4 w-4" />
                          Pagamento confirmado
                          {line.paid_at ? ` em ${new Date(line.paid_at).toLocaleDateString("pt-BR")}` : ""}
                        </div>
                      ) : (
                        <MethodFormBody
                          type={line.type}
                          value={line.value}
                          installments={line.installments}
                          isPaying={isPaying}
                          onPay={() => handleLineConfirm(line.id, line.type, Number(line.value))}
                          leadName={customer.name || data.lead_name}
                        />
                      )}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
              <button
                type="button"
                className="mt-4 text-xs text-muted-foreground underline-offset-4 hover:underline"
                onClick={() => setSingleFormDialogOpen(true)}
              >
                Prefiro pagar tudo em uma forma só
              </button>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={singleFormDialogOpen} onOpenChange={setSingleFormDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Escolha uma forma única</DialogTitle>
            <DialogDescription>Substituirá o plano sugerido por uma forma de pagamento integral.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {([
              { type: "cartao" as PayType, label: "Cartão Z2Pay em até 12x", installments: 12 },
              { type: "pix" as PayType, label: "Pix do valor total", installments: 1 },
              { type: "tmb" as PayType, label: "Boleto TMB parcelado", installments: 12 },
            ]).map((opt) => (
              <button
                key={opt.type}
                type="button"
                onClick={() => {
                  setOverrideLine({
                    id: `override-${opt.type}`,
                    type: opt.type,
                    value: Number(data.value),
                    installments: opt.installments,
                  });
                  setSingleFormDialogOpen(false);
                }}
                className="flex w-full items-center justify-between rounded-md border border-border p-3 text-left text-sm hover:bg-muted/50"
              >
                <span>{methodIcon[opt.type]} {opt.label}</span>
                <span className="text-xs text-muted-foreground">{formatCurrency(Number(data.value))}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}