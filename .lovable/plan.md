## Diagnóstico — somente leitura

### 1. URL emitida pelos geradores

**`src/pages/checkout/NovaCobrancaDrawer.tsx:292`**
```ts
const link = `${window.location.origin}/pay/${linkId}`;
```

**`src/pages/checkout/NovoLinkProdutoDrawer.tsx:126`**
```ts
const link = `${window.location.origin}/pay/${linkId}`;
```

**`src/pages/comunicacao/Conversas.tsx`** — dois caminhos coexistem:
- Linha 107 (`sendInvoiceLink`, fatura mock já existente): link **externo fixo**
  ```ts
  const link = `https://z2pay.co/pay/${invoiceId.toLowerCase()}`;
  ```
- Linha 361 (callback `onInvoiceCreated` do `NovaCobrancaDrawer`, nova cobrança gerada na hora): link local
  ```ts
  const link = `${window.location.origin}/pay/${data.linkId}`;
  ```

Resumo: geradores reais usam `window.location.origin + /pay/:id`. O único ponto que emite domínio externo `z2pay.co` é o `sendInvoiceLink` em Conversas, e só para faturas mock pré-existentes — não para cobranças recém-criadas via drawer.

### 2. Rota `/pay`

**`src/App.tsx:252-260`** — `/pay/:linkId` está montada **fora** de `ProtectedRoute`, como rota irmã de `/auth` e antes do catch-all autenticado:
```tsx
<Routes>
  <Route path="/auth" element={<Auth />} />
  <Route path="/pay/:linkId" element={<PublicCheckout />} />
  <Route path="/*" element={<AppLayout />} />   {/* AppLayout = ProtectedRoute */}
</Routes>
```
`ProtectedRoute` (linhas 81-97) só envolve `AppLayout`.

**`PublicCheckout.tsx`** não importa `useAuth`, não faz checagem de sessão e não tem `Navigate to="/auth"`. Não há gate de autenticação dentro do componente.

Conclusão: a rota **é pública por construção**. Se um link `/pay/:id` está caindo em `/auth`, não é por causa do roteamento atual — ou o usuário abriu outra URL, ou o request está sendo redirecionado antes de chegar ao React (ex.: link `https://z2pay.co/...` do item 1, que vai para fora do app).

### 3. Leitura pública via RPC

**`src/pages/checkout/PublicCheckout.tsx:587-588`**
```ts
const { data: rows, error } = await (supabase as any)
  .rpc("get_public_payment_link", { p_id: linkId });
```
A função `get_public_payment_link` é `SECURITY DEFINER` (vista em `<db-functions>`), então o cliente Supabase anônimo (anon key, sem sessão) consegue executá-la mesmo com RLS de `payment_links` restrita a `producer_id = auth.uid()`. A leitura pública funciona.

### 4. Prefill dos dados do contato

**Insert em `NovaCobrancaDrawer.tsx:268-285`** — grava `lead_name`, `lead_email`, `lead_phone`:
```ts
const { error } = await supabase.from("payment_links").insert({
  id: linkId,
  producer_id: userId,
  lead_name: clientName || "Cliente",
  lead_email: clientEmail || null,
  lead_phone: clientPhone || null,
  ...
});
```
Origem desses campos: estado local do drawer (`clientName/Email/Phone`), populado quando `prefilledLead` é passado — match por nome/email contra `unifiedLeads` (linhas 131-140). O `prefilledLead` carrega só `{ name, email, pipelineValue }`, **sem telefone**.

**Insert em `NovoLinkProdutoDrawer.tsx:110-119`** — **não grava** `lead_email` nem `lead_phone`, e fixa o nome:
```ts
lead_name: "Cliente (link de produto)",
description: offerName || product,
value,
```

**`Conversas.tsx:378-383`** passa o lead para o drawer, mas **sem telefone**:
```tsx
prefilledLead={selectedConvData ? {
  name: selectedConvData.name,
  email: selectedConvData.email,
  pipelineValue: 25000,
} : undefined}
```

**`PublicCheckout.tsx:574, 593-599`** — inicializa o customer com `name` apenas, e só se o valor não for um placeholder:
```ts
const [customer, setCustomer] = useState<CustomerData>({ name: "", cpf: "", email: "", phone: "" });
...
setCustomer((prev) => ({
  name: prev.name || (r.lead_name && r.lead_name !== "Cliente (link de produto)" && r.lead_name !== "Cliente" ? r.lead_name : ""),
  cpf: prev.cpf,
  email: prev.email,
  phone: prev.phone,
}));
```
`email` e `phone` **nunca são lidos** de `r.lead_email`/`r.lead_phone` — ficam vazios mesmo quando o insert salvou. CPF não existe em `prefilledLead` nem no insert.

Os inputs são editáveis (componentes `<Input>` controlados por `customer`). O bloco de cartão (`CardBlock`, linhas ~328+) inicia com `cvv=""` e `manual={ number, expiry, cvv, name }` todos vazios — cartão/CVV não são pré-preenchidos.

### Resumo dos achados (sem propor correção)

- Geração de link: já usa `window.location.origin/pay/:id` nos drawers reais. Único resíduo de `z2pay.co` é em `Conversas.sendInvoiceLink` (faturas mock antigas), não nas cobranças recém-criadas.
- Rota: `/pay/:linkId` já está fora de `ProtectedRoute`, sem checagem de sessão no componente.
- Leitura pública: já via RPC `SECURITY DEFINER` — funciona anônimo.
- Prefill: parcialmente quebrado em três pontos —
  1. `Conversas` não propaga `phone` em `prefilledLead`.
  2. `NovoLinkProdutoDrawer` não persiste `lead_email`/`lead_phone` e fixa `lead_name` em placeholder.
  3. `PublicCheckout` só hidrata `customer.name`; ignora `r.lead_email` e `r.lead_phone` no load.
