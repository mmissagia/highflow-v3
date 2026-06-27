import { Link } from "react-router-dom";
import { ShieldAlert, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NoAccess({ variant = "forbidden" }: { variant?: "forbidden" | "no-company" }) {
  const noCompany = variant === "no-company";
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-6">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        {noCompany ? (
          <Building2 className="h-7 w-7 text-muted-foreground" />
        ) : (
          <ShieldAlert className="h-7 w-7 text-muted-foreground" />
        )}
      </div>
      <h2 className="text-xl font-semibold">
        {noCompany ? "Conta sem empresa vinculada" : "Acesso restrito"}
      </h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        {noCompany
          ? "Sua conta ainda não está vinculada a nenhuma empresa. Peça um convite ao administrador da sua empresa ou agência."
          : "Você não tem permissão para acessar este módulo com o seu perfil atual."}
      </p>
      {!noCompany && (
        <Button asChild className="mt-6">
          <Link to="/">Voltar para o início</Link>
        </Button>
      )}
    </div>
  );
}
