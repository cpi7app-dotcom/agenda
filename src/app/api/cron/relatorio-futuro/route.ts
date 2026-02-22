import { db } from "@/db";
import { agendamentos, notificacoes, usuariosInfo } from "@/db/schema";
import { inArray, and, eq, gte, lt } from "drizzle-orm";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { enviarEmail } from "@/lib/email";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Força o Next.js a rodar essa rota de forma dinâmica
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    try {
        // Obter auth header para validar chamada se necessário pelo Vercel Cron
        // const authHeader = req.headers.get('authorization');
        // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        //     return new Response('Unauthorized', { status: 401 });
        // }

        // 1. Encontrar o intervalo da próxima semana (Segunda a Sexta)
        const hoje = new Date();
        const diasParaSegunda = (1 - hoje.getDay() + 7) % 7 || 7;
        const proxSegunda = new Date(hoje);
        proxSegunda.setDate(hoje.getDate() + diasParaSegunda);
        proxSegunda.setHours(0, 0, 0, 0);

        const proxSexta = new Date(proxSegunda);
        proxSexta.setDate(proxSegunda.getDate() + 4);
        proxSexta.setHours(23, 59, 59, 999);

        // 2. Buscar Agendamentos
        const futuros = await db
            .select({
                id: agendamentos.id,
                dataHora: agendamentos.dataHora,
                motivo: agendamentos.motivo,
                postoGraduacao: usuariosInfo.postoGraduacao,
                nomeGuerra: usuariosInfo.nomeGuerra,
            })
            .from(agendamentos)
            .leftJoin(usuariosInfo, eq(agendamentos.solicitanteId, usuariosInfo.id))
            .where(
                and(
                    eq(agendamentos.status, "Agendado"),
                    gte(agendamentos.dataHora, proxSegunda),
                    lt(agendamentos.dataHora, proxSexta)
                )
            )
            .all();

        // 3. Formatar Mensagem
        let mensagem = `📆 PREVISÃO: Existem ${futuros.length} agendamentos previstos para a próxima semana.\n`;

        if (futuros.length > 0) {
            mensagem += `Verifique o painel para listar as trocas de funcionais aguardando atendimento.`;
        }

        // 4. Buscar Administradores
        const admins = await db.select().from(usuariosInfo).where(inArray(usuariosInfo.role, ["admin_p5", "admin_central"])).all();

        // 5. Salvar Notificações
        for (const admin of admins) {
            await db.insert(notificacoes).values({
                id: randomUUID(),
                usuarioId: admin.id,
                mensagem,
                lida: false,
                createdAt: new Date(),
            });

            // Envia e-mail real via Resend
            if (admin.email) {
                const listaFormatada = futuros.map(f =>
                    `- ${f.postoGraduacao ?? ""} ${f.nomeGuerra ?? ""} | ${format(new Date(f.dataHora), "EEE dd/MM HH:mm", { locale: ptBR })} | ${f.motivo}`
                ).join("\n");

                await enviarEmail({
                    para: admin.email,
                    assunto: `Relatório: Agendamentos da Próxima Semana`,
                    corpo: `Olá, ${admin.postoGraduacao} ${admin.nomeGuerra}!\n\n${mensagem}\n\n${futuros.length > 0 ? listaFormatada : ""}\n\nAcesse o painel para mais detalhes.\n\nAtenciosamente,\nSistema de Troca de Funcionais`,
                });
            }
        }

        return NextResponse.json({ success: true, count: futuros.length, message: "Relatório Futuro gerado." });
    } catch (error) {
        console.error("Erro CRON Relatorio Futuro", error);
        return NextResponse.json({ success: false, error: "Falha ao executar CRON" }, { status: 500 });
    }
}
