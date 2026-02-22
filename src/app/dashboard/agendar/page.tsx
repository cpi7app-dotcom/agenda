import { getPerfilUsuario } from "@/server/actions/perfil";
import { redirect } from "next/navigation";
import { CalendarDays } from "lucide-react";
import AgendarForm from "./form";

export default async function AgendarPage() {
    const perfil = await getPerfilUsuario();

    if (!perfil) {
        // Redireciona para completar cadastro caso o usuário tente pular etapas
        redirect("/dashboard/perfil");
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6 pt-10">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-pm-blue flex items-center gap-3">
                    <CalendarDays className="h-8 w-8" />
                    Agendar Troca de Funcional
                </h1>
                <p className="text-muted-foreground mt-2">
                    Siga os passos abaixo para escolher o motivo, a data e o horário da sua
                    solicitação.
                </p>
            </div>

            <AgendarForm perfil={perfil} />
        </div>
    );
}
