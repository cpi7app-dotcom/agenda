import { getPerfilUsuario } from "@/server/actions/perfil";
import { redirect } from "next/navigation";
import { CalendarDays, Zap } from "lucide-react";
import AgendarForm from "./form";

export default async function AgendarPage(
    props: { searchParams: Promise<{ encaixe?: string }> }
) {
    const searchParams = await props.searchParams;
    const perfil = await getPerfilUsuario();
    const isEncaixe = searchParams.encaixe === "true";

    if (!perfil) {
        redirect("/dashboard/perfil");
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6 pt-10">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-pm-blue flex items-center gap-3">
                    {isEncaixe ? (
                        <Zap className="h-8 w-8 text-amber-500" />
                    ) : (
                        <CalendarDays className="h-8 w-8" />
                    )}
                    {isEncaixe ? "Encaixe" : "Agendar Troca de Funcional"}
                </h1>
                <p className="text-muted-foreground mt-2">
                    {isEncaixe
                        ? "Agendamento imediato para agora, sem restrição de horário. Preencha o motivo e confirme."
                        : "Siga os passos abaixo para escolher o motivo, a data e o horário da sua solicitação."}
                </p>
            </div>

            <AgendarForm perfil={perfil} isEncaixe={isEncaixe} />
        </div>
    );
}
