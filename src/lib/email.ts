import { Resend } from "resend";

// A chave é lida no servidor pelo processo do Next.js
const resend = new Resend(process.env.RESEND_API_KEY);

// Remetente padrão (plano gratuito Resend)
const FROM = "Agenda CPI-7 <onboarding@resend.dev>";

export async function enviarEmail({
    para,
    assunto,
    corpo,
}: {
    para: string;
    assunto: string;
    corpo: string;
}) {
    try {
        const { data, error } = await resend.emails.send({
            from: FROM,
            to: [para],
            subject: assunto,
            text: corpo,
        });

        if (error) {
            console.error("[RESEND ERROR]", error);
            return { success: false };
        }

        console.log("[RESEND OK] Email enviado:", data?.id);
        return { success: true };
    } catch (err) {
        console.error("[RESEND EXCEPTION]", err);
        return { success: false };
    }
}
