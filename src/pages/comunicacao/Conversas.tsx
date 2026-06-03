import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { MessageCircle, Send, QrCode, Link as LinkIcon, Search, Phone, Sparkles, CreditCard, ArrowUp, X } from "lucide-react";
import { Link } from "react-router-dom";
import { mockInvoicesData, formatCurrency, statusConfig } from "@/data/checkoutData";
import { NovaCobrancaDrawer } from "@/pages/checkout/NovaCobrancaDrawer";
import { PulsaGlyph } from "@/components/ai/PulsaGlyph";
import { formatRelativeTime } from "@/lib/utils";

const now = Date.now();
const conversationTimestamps: Record<number, string> = {
  1: new Date(now - 2 * 60 * 1000).toISOString(),
  2: new Date(now - 15 * 60 * 1000).toISOString(),
  3: new Date(now - 60 * 60 * 1000).toISOString(),
  4: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
};

const PULSA_SUGGESTION = {
  text: "Oi {nome}, vi que você abriu nossa proposta ontem. Conseguiu dar uma olhada? Posso esclarecer qualquer ponto agora.",
  reasoning:
    "Lead abriu proposta há 18h sem responder. Padrão dos seus dados: abordagem direta em 24h converte 2.3x melhor.",
};

const conversations = [
  { id: 1, name: "João Silva", email: "joao@email.com", phone: "+55 11 99999-9999", lastMessage: "Qual o valor da mentoria?", lastMessageAt: conversationTimestamps[1], unread: 2, stage: "Warm" },
  { id: 2, name: "Maria Santos", email: "maria@email.com", phone: "+55 21 98888-8888", lastMessage: "Recebi o link, vou olhar!", lastMessageAt: conversationTimestamps[2], unread: 0, stage: "Follow-up" },
  { id: 3, name: "Pedro Costa", email: "pedro@email.com", phone: "+55 31 97777-7777", lastMessage: "Posso parcelar em quantas vezes?", lastMessageAt: conversationTimestamps[3], unread: 1, stage: "Call Agendada" },
  { id: 4, name: "Ana Oliveira", email: "ana@email.com", phone: "+55 41 96666-6666", lastMessage: "Obrigada pelas informações!", lastMessageAt: conversationTimestamps[4], unread: 0, stage: "Engajado" },
];

const currentChat = {
  id: 1,
  name: "João Silva",
  phone: "+55 11 99999-9999",
  stage: "Warm",
  messages: [
    { id: 1, sender: "lead", text: "Oi, participei do evento ontem", time: "14:30" },
    { id: 2, sender: "closer", text: "Olá João! Que bom ter você no evento! O que achou?", time: "14:32" },
    { id: 3, sender: "lead", text: "Muito bom! Fiquei interessado na mentoria", time: "14:35" },
    { id: 4, sender: "closer", text: "Excelente escolha! A Mentoria Elite é perfeita para quem quer acelerar resultados. Posso te enviar os detalhes?", time: "14:36" },
    { id: 5, sender: "lead", text: "Qual o valor da mentoria?", time: "14:40" },
  ],
  sunLinks: [
    { type: "Cartão", url: "https://sun.co/mentoria-elite-card" },
    { type: "PIX", url: "https://sun.co/mentoria-elite-pix" },
  ],
};

export default function Conversas() {
  const [message, setMessage] = useState("");
  const [selectedConversation, setSelectedConversation] = useState(currentChat);
  const [chatMessages, setChatMessages] = useState(currentChat.messages);
  const [cobrancaOpen, setCobrancaOpen] = useState(false);
  const [pickInvoiceOpen, setPickInvoiceOpen] = useState(false);
  const [suggestionDismissed, setSuggestionDismissed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset Pulsa suggestion when switching conversation
  useEffect(() => {
    setSuggestionDismissed(false);
  }, [selectedConversation.id]);

  const selectedConvData = conversations.find((c) => c.id === selectedConversation.id);
  const leadName = selectedConvData?.name || selectedConversation.name;
  const firstName = leadName.split(" ")[0];
  const suggestionText = PULSA_SUGGESTION.text.replace(/\{nome\}/g, firstName);

  const handleUseSuggestion = () => {
    setMessage(suggestionText);
    setSuggestionDismissed(true);
    inputRef.current?.focus();
  };

  // Pending invoices for the selected lead
  const pendingInvoices = mockInvoicesData.filter(
    (inv) => inv.clientName === leadName && (inv.status === "pendente" || inv.status === "enviada")
  );

  const sendMessage = () => {
    if (!message.trim()) return;
    setChatMessages((prev) => [
      ...prev,
      { id: prev.length + 1, sender: "closer", text: message, time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) },
    ]);
    setMessage("");
  };

  const handleSendCobranca = () => {
    if (pendingInvoices.length > 0) {
      setPickInvoiceOpen(true);
    } else {
      setCobrancaOpen(true);
    }
  };

  const sendInvoiceLink = (invoiceId: string) => {
    const inv = mockInvoicesData.find((i) => i.id === invoiceId);
    if (!inv) return;
    const link = `https://z2pay.co/pay/${invoiceId.toLowerCase()}`;
    setChatMessages((prev) => [
      ...prev,
      {
        id: prev.length + 1,
        sender: "closer",
        text: `💳 Link de pagamento enviado:\n${inv.description} — ${formatCurrency(inv.value)}\n${link}`,
        time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
    setPickInvoiceOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Conversas WhatsApp</h1>
          <p className="text-muted-foreground">Central de atendimento e vendas</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6 h-[calc(100vh-220px)]">
        {/* Lista de Conversas */}
        <Card className="col-span-1 flex flex-col">
          <CardHeader className="pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar conversa..." className="pl-10" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-340px)]">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors ${selectedConversation.id === conv.id ? "bg-muted" : ""}`}
                  onClick={() => setSelectedConversation({ ...currentChat, id: conv.id, name: conv.name })}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {conv.name.split(" ").map((n) => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium truncate">{conv.name}</p>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {formatRelativeTime(conv.lastMessageAt)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground truncate">{conv.lastMessage}</p>
                        {conv.unread > 0 && (
                          <Badge className="bg-green-500 text-white text-xs h-5 w-5 flex items-center justify-center rounded-full p-0">{conv.unread}</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </ScrollArea>
          </CardContent>
          {/* Footer: Pulsa indicator */}
          <div className="border-t p-3 mt-auto">
            <div className="flex items-center gap-2 rounded-md bg-success/10 px-2.5 py-1.5">
              <PulsaGlyph size="sm" />
              <p className="text-xs font-medium text-foreground flex-1">
                Pulsa ativa no seu WhatsApp
              </p>
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
              </span>
            </div>
          </div>
        </Card>

        {/* Chat Ativo */}
        <Card className="col-span-2 flex flex-col">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {selectedConversation.name.split(" ").map((n) => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{selectedConversation.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedConversation.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{selectedConversation.stage}</Badge>
                <Link to={`/crm/lead/${selectedConversation.id}`}>
                  <Button variant="ghost" size="sm">Ver Ficha</Button>
                </Link>
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex-1 p-4 overflow-hidden">
            <ScrollArea className="h-full pr-4">
              <div className="space-y-4">
                {chatMessages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.sender === "closer" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[70%] p-3 rounded-lg ${msg.sender === "closer" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                      <p className="text-sm whitespace-pre-line">{msg.text}</p>
                      <p className={`text-xs mt-1 ${msg.sender === "closer" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{msg.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>

          <div className="p-4 border-t">
            {!suggestionDismissed && (
              <div className="mb-3 rounded-lg border border-ai/20 bg-ai/5 p-3">
                <div className="flex items-start gap-2.5">
                  <PulsaGlyph size="sm" className="mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-ai">
                      Pulsa sugere
                    </p>
                    <p className="text-sm text-foreground leading-snug">
                      {suggestionText}
                    </p>
                    <p className="text-xs text-muted-foreground italic">
                      {PULSA_SUGGESTION.reasoning}
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <Button size="sm" variant="default" onClick={handleUseSuggestion} className="h-7 gap-1.5">
                        <ArrowUp className="h-3 w-3" />
                        Usar sugestão
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => setSuggestionDismissed(true)}
                        aria-label="Dispensar sugestão"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Input
                ref={inputRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Digite sua mensagem..."
                onKeyPress={(e) => e.key === "Enter" && sendMessage()}
              />
              <Button size="icon" onClick={sendMessage}><Send className="h-4 w-4" /></Button>
            </div>
          </div>
        </Card>

        {/* Ações Rápidas */}
        <Card className="col-span-1">
          <CardHeader><CardTitle className="text-lg">Ações Rápidas</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Enviar Link SUN</p>
              {selectedConversation.sunLinks.map((link, idx) => (
                <Button key={idx} variant="outline" className="w-full justify-start gap-2" size="sm">
                  <LinkIcon className="h-4 w-4" />{link.type}
                </Button>
              ))}
            </div>

            {/* Enviar Cobrança */}
            <Button
              variant="outline"
              className="w-full justify-start gap-2 border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
              onClick={handleSendCobranca}
            >
              <CreditCard className="h-4 w-4" />
              💳 Enviar Cobrança
              {pendingInvoices.length > 0 && (
                <Badge variant="secondary" className="ml-auto text-xs">{pendingInvoices.length}</Badge>
              )}
            </Button>

            <Button variant="outline" className="w-full justify-start gap-2">
              <QrCode className="h-4 w-4" />Gerar QR Code
            </Button>

            <div className="border-t pt-4">
              <Button variant="outline" className="w-full justify-start gap-2">
                <Phone className="h-4 w-4" />Agendar Call
              </Button>
            </div>

            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <p className="text-sm font-medium">Sugestão IA</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  "O lead perguntou sobre valor. Responda com benefícios antes do preço e ofereça parcelamento."
                </p>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </div>

      {/* Pick invoice dialog */}
      <Dialog open={pickInvoiceOpen} onOpenChange={setPickInvoiceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Selecione a cobrança para enviar</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 mt-2">
            {pendingInvoices.map((inv) => {
              const sc = statusConfig[inv.status];
              return (
                <button
                  key={inv.id}
                  onClick={() => sendInvoiceLink(inv.id)}
                  className="flex items-center justify-between w-full p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left"
                >
                  <div>
                    <p className="font-medium text-sm">{inv.description}</p>
                    <p className="text-xs text-muted-foreground">{inv.id}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold tabular-nums text-sm">{formatCurrency(inv.value)}</span>
                    <Badge variant="outline" className={`text-xs ${sc.className}`}>{sc.label}</Badge>
                  </div>
                </button>
              );
            })}
            <Button variant="outline" className="w-full mt-2" onClick={() => { setPickInvoiceOpen(false); setCobrancaOpen(true); }}>
              + Criar nova cobrança
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Nova Cobrança Drawer */}
      <NovaCobrancaDrawer
        open={cobrancaOpen}
        onOpenChange={setCobrancaOpen}
        onInvoiceCreated={(data) => {
          const link = `${window.location.origin}/pay/${data.linkId}`;
          setChatMessages((prev) => [
            ...prev,
            {
              id: prev.length + 1,
              sender: "closer",
              text: `💳 Link de pagamento enviado:\n${data.description} — ${formatCurrency(data.value)}\n${link}`,
              time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
            },
          ]);
        }}
        prefilledLead={selectedConvData ? {
          name: selectedConvData.name,
          email: selectedConvData.email,
          phone: selectedConvData.phone,
          pipelineValue: 25000,
        } : undefined}
      />
    </div>
  );
}
