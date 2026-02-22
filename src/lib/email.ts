import { Resend } from "resend";

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
        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) {
            console.warn("[EMAIL] RESEND_API_KEY não configurada. E-mail não enviado.");
            return { success: false };
        }

        // Instância criada de forma lazy (dentro da função), nunca em tempo de build
        const resend = new Resend(apiKey);

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
