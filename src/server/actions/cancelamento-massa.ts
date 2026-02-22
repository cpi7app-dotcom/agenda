"use server";

import { db } from "@/db";
import { agendamentos, bloqueios, notificacoes, usuariosInfo } from "@/db/schema";
import { and, eq, gte, lt, inArray } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { getPerfilUsuario } from "./perfil";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { enviarEmail } from "@/lib/email";

export async function cancelarPeriodo(
    dataInicio: Date,
    dataFim: Date,
    motivo: string
) {
    try {
        const { userId } = await auth();
        if (!userId) return { success: false, message: "Não autorizado" };

        const admin = await getPerfilUsuario();
        if (!admin || admin.role === "user") {
            return { success: false, message: "Acesso negado." };
        }

        // 1. Inserir bloqueio para impedir novos agendamentos
        await db.insert(bloqueios).values({
            id: randomUUID(),
            inicio: dataInicio,
            fim: dataFim,
            motivo,
            criadoPorId: userId,
            createdAt: new Date(),
        });

        // 2. Buscar agendamentos existentes no período
        const afetados = await db
            .select()
            .from(agendamentos)
            .where(
                and(
                    gte(agendamentos.dataHora, dataInicio),
                    lt(agendamentos.dataHora, dataFim),
                    eq(agendamentos.status, "Agendado")
                )
            )
            .all();

        if (afetados.length > 0) {
            // Cancelar os agendamentos afetados
            for (const agnd of afetados) {
                await db
                    .update(agendamentos)
                    .set({ status: "Cancelado" })
                    .where(eq(agendamentos.id, agnd.id));

                const msg = `Nos desculpe pelo transtorno, mas por motivo de força maior (${motivo}), o seu agendamento do protocolo ${agnd.id} foi cancelado. Por favor, reagende para uma nova data.`;

                // Notificação In-App
                await db.insert(notificacoes).values({
                    id: randomUUID(),
                    usuarioId: agnd.solicitanteId,
                    mensagem: msg,
                    lida: false,
                    createdAt: new Date(),
                });

                // Buscar email do usuário no Clerk para envio de e-mail
                const usuarioInfo = await db.select({ re: usuariosInfo.re, nomeGuerra: usuariosInfo.nomeGuerra, email: usuariosInfo.email })
                    .from(usuariosInfo)
                    .where(eq(usuariosInfo.id, agnd.solicitanteId))
                    .get();

                // Envia email real via Resend se o usuário tiver e-mail cadastrado
                if (usuarioInfo?.email) {
                    await enviarEmail({
                        para: usuarioInfo.email,
                        assunto: `Cancelamento de Agendamento - Protocolo ${agnd.id}`,
                        corpo: `Olá, ${usuarioInfo.nomeGuerra ?? ""}!\n\n${msg}\n\nAtenciosamente,\nCentral de Troca de Funcionais`,
                    });
                }
            }
        }

        revalidatePath("/dashboard/admin/agendamentos");
        revalidatePath("/dashboard/agenda");
        return {
            success: true,
            message: `Período bloqueado. ${afetados.length} agendamentos foram cancelados.`
        };

    } catch (error) {
        console.error("Erro ao cancelar período", error);
        return { success: false, message: "Erro interno ao bloquear período." };
    }
}

export async function getBloqueiosAtivos() {
    try {
        const admin = await getPerfilUsuario();
        if (!admin || admin.role === "user") return [];

        return await db
            .select()
            .from(bloqueios)
            .where(gte(bloqueios.fim, new Date()))
            .orderBy(bloqueios.inicio)
            .all();
    } catch (error) {
        console.error(error);
        return [];
    }
}

export async function removerBloqueio(id: string) {
    try {
        const { userId } = await auth();
        if (!userId) return { success: false, message: "Não autorizado" };

        const admin = await getPerfilUsuario();
        if (!admin || admin.role === "user") {
            return { success: false, message: "Acesso negado." };
        }

        await db.delete(bloqueios).where(eq(bloqueios.id, id));

        revalidatePath("/dashboard/admin/agendamentos");
        revalidatePath("/dashboard/agenda");

        return { success: true, message: "Período desbloqueado com sucesso." };
    } catch (error) {
        console.error(error);
        return { success: false, message: "Erro ao remover bloqueio." };
    }
}
