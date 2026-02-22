"use server";

import { db } from "@/db";
import { agendamentos, usuariosInfo } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { enviarEmail } from "@/lib/email";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const agendamentoSchema = z.object({
    dataHora: z.date(),
    motivo: z.string().min(3, "Insira um motivo válido"),
    porIntermedioServico: z.boolean(),
});

export async function criarAgendamento(data: z.infer<typeof agendamentoSchema>) {
    try {
        const { userId } = await auth();
        if (!userId) return { success: false, message: "Não autorizado" };

        const parsed = agendamentoSchema.safeParse(data);
        if (!parsed.success) return { success: false, message: "Dados inválidos" };

        const { dataHora, motivo, porIntermedioServico } = parsed.data;
        const protocolo = crypto.randomUUID().slice(0, 8).toUpperCase();

        await db.insert(agendamentos).values({
            id: protocolo,
            solicitanteId: userId,
            dataHora,
            motivo,
            porIntermedioServico,
            status: "Agendado",
            createdAt: new Date(),
        });

        revalidatePath("/dashboard/agenda");

        // Enviar e-mail de confirmação para o usuário
        const perfilUsuario = await db.select({ email: usuariosInfo.email, nomeGuerra: usuariosInfo.nomeGuerra, postoGraduacao: usuariosInfo.postoGraduacao })
            .from(usuariosInfo)
            .where(eq(usuariosInfo.id, userId))
            .get();

        if (perfilUsuario?.email) {
            const dataFormatada = format(dataHora, "EEEE, dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
            await enviarEmail({
                para: perfilUsuario.email,
                assunto: `Agendamento Confirmado - Protocolo ${protocolo}`,
                corpo: `Olá, ${perfilUsuario.postoGraduacao} ${perfilUsuario.nomeGuerra}!\n\nSeu agendamento foi confirmado!\n\nProtocolo: ${protocolo}\nData e Hora: ${dataFormatada}\nMotivo: ${motivo}\n\nMantenha este protocolo para referência. Em caso de dúvidas, entre em contato com a CPI-7.\n\nAtenciosamente,\nCentral de Troca de Funcionais`,
            });
        }

        return { success: true, protocolo, message: "Agendamento confirmado!" };
    } catch (error) {
        console.error(error);
        return { success: false, message: "Erro ao criar agendamento" };
    }
}

export async function criarEncaixe(motivo: string) {
    try {
        const { userId } = await auth();
        if (!userId) return { success: false, message: "Não autorizado" };

        if (!motivo || motivo.length < 2) return { success: false, message: "Informe o motivo do encaixe" };

        const protocolo = "ENC-" + crypto.randomUUID().slice(0, 6).toUpperCase();

        await db.insert(agendamentos).values({
            id: protocolo,
            solicitanteId: userId,
            dataHora: new Date(), // Agora, ignorando restrições de horário
            motivo,
            porIntermedioServico: false,
            status: "Agendado",
            createdAt: new Date(),
        });

        revalidatePath("/dashboard/agenda");

        const perfilUsuario = await db.select({
            email: usuariosInfo.email,
            nomeGuerra: usuariosInfo.nomeGuerra,
            postoGraduacao: usuariosInfo.postoGraduacao,
        }).from(usuariosInfo).where(eq(usuariosInfo.id, userId)).get();

        if (perfilUsuario?.email) {
            await enviarEmail({
                para: perfilUsuario.email,
                assunto: `Encaixe Confirmado - Protocolo ${protocolo}`,
                corpo: `Olá, ${perfilUsuario.postoGraduacao} ${perfilUsuario.nomeGuerra}!\n\nSeu encaixe foi registrado com sucesso!\n\nProtocolo: ${protocolo}\nMotivo: ${motivo}\n\nComareça imediatamente ao setor com sua documentação.\n\nAtenciosamente,\nCentral de Troca de Funcionais`,
            });
        }

        return { success: true, protocolo, message: "Encaixe registrado!" };
    } catch (error) {
        console.error(error);
        return { success: false, message: "Erro ao registrar encaixe" };
    }
}

export async function cancelarAgendamento(agendamentoId: string) {
    try {
        const { userId } = await auth();
        if (!userId) return { success: false, message: "Não autorizado" };

        // Busca o agendamento para verificar dono
        const agendamento = await db
            .select()
            .from(agendamentos)
            .where(eq(agendamentos.id, agendamentoId))
            .get();

        if (!agendamento) return { success: false, message: "Agendamento não encontrado" };
        if (agendamento.solicitanteId !== userId) return { success: false, message: "Sem permissão" };
        if (agendamento.status !== "Agendado") return { success: false, message: "Só é possível cancelar agendamentos com status 'Agendado'" };

        await db
            .update(agendamentos)
            .set({ status: "Cancelado" })
            .where(eq(agendamentos.id, agendamentoId));

        revalidatePath("/dashboard/agenda");
        return { success: true, message: "Agendamento cancelado com sucesso" };
    } catch (error) {
        console.error(error);
        return { success: false, message: "Erro ao cancelar agendamento" };
    }
}

export type AgendamentoComPerfil = {
    id: string;
    dataHora: Date;
    motivo: string;
    status: string;
    porIntermedioServico: boolean;
    solicitanteId: string;
    postoGraduacao: string | null;
    nomeGuerra: string | null;
    numeroOficioSei: string | null;
};

export async function getAgendamentos(): Promise<AgendamentoComPerfil[]> {
    try {
        const { userId } = await auth();
        if (!userId) return [];

        const usuarioLogado = await db
            .select()
            .from(usuariosInfo)
            .where(eq(usuariosInfo.id, userId))
            .get();

        if (!usuarioLogado) return [];

        // Busca agendamentos com JOIN nas infos do usuário
        const isAdmin = usuarioLogado.role !== "user";

        const rows = await db
            .select({
                id: agendamentos.id,
                dataHora: agendamentos.dataHora,
                motivo: agendamentos.motivo,
                status: agendamentos.status,
                porIntermedioServico: agendamentos.porIntermedioServico,
                solicitanteId: agendamentos.solicitanteId,
                postoGraduacao: usuariosInfo.postoGraduacao,
                nomeGuerra: usuariosInfo.nomeGuerra,
                numeroOficioSei: usuariosInfo.numeroOficioSei,
            })
            .from(agendamentos)
            .leftJoin(usuariosInfo, eq(agendamentos.solicitanteId, usuariosInfo.id))
            .orderBy(desc(agendamentos.dataHora))
            .all();

        // Filtro por usuário se não for admin
        if (!isAdmin) {
            return rows.filter((r) => r.solicitanteId === userId);
        }

        return rows;
    } catch (error) {
        console.error(error);
        return [];
    }
}
