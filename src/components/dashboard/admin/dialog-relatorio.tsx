"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { gerarDadosRelatorio, TipoRelatorio } from "@/server/actions/relatorio";
import { toast } from "sonner";
import { FileBarChart } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function DialogRelatorio() {
    const [open, setOpen] = useState(false);
    const [etapa, setEtapa] = useState<"tipo" | "periodo">("tipo");
    const [tipo, setTipo] = useState<TipoRelatorio | "">("");
    const [dataInicio, setDataInicio] = useState("");
    const [dataFim, setDataFim] = useState("");
    const [isPending, startTransition] = useTransition();

    function resetar() {
        setEtapa("tipo");
        setTipo("");
        setDataInicio("");
        setDataFim("");
    }

    function handleTipoConfirmado() {
        if (!tipo) return;
        setEtapa("periodo");
    }

    function handleGerarRelatorio() {
        if (!tipo || !dataInicio || !dataFim) return;
        startTransition(async () => {
            const res = await gerarDadosRelatorio(tipo, dataInicio, dataFim);
            if (!res.success || !res.dados) {
                toast.error(res.message || "Erro ao gerar relatório");
                return;
            }

            const tipoLabel = tipo === "Realizado" ? "Funcionais Realizadas" : "Cancelamentos por Ausência";
            const periodoLabel = `${format(new Date(dataInicio + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })} a ${format(new Date(dataFim + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })}`;

            const linhas = res.dados.map(d => `
                <tr>
                    <td>${format(new Date(d.dataHora), "dd/MM/yyyy HH:mm")}</td>
                    <td>${d.re || "—"}</td>
                    <td>${d.postoGraduacao || ""} ${d.nomeGuerra || "—"}</td>
                    <td>${d.motivo}</td>
                    <td>${d.numeroOficioSei || "—"}</td>
                    <td>${d.porIntermedioServico ? "Sim" : "Não"}</td>
                    <td>${d.id}</td>
                </tr>
            `).join("");

            const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<title>Relatório — ${tipoLabel}</title>
<style>
  body { font-family: Arial, sans-serif; padding: 32px; color: #1e293b; }
  h1 { font-size: 20px; color: #1e3a5f; margin-bottom: 4px; }
  p.periodo { color: #64748b; font-size: 13px; margin-bottom: 24px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { background: #1e3a5f; color: white; padding: 10px 8px; text-align: left; }
  td { border-bottom: 1px solid #e2e8f0; padding: 8px; vertical-align: top; }
  tr:nth-child(even) td { background: #f8fafc; }
  .rodape { margin-top: 24px; font-size: 11px; color: #94a3b8; text-align: right; }
  @media print { button { display: none; } }
</style>
</head>
<body>
  <h1>Relatório — ${tipoLabel}</h1>
  <p class="periodo">Período: ${periodoLabel} &nbsp;|&nbsp; Total de registros: <strong>${res.dados.length}</strong></p>
  <table>
    <thead>
      <tr>
        <th>Data/Hora</th><th>RE</th><th>Nome de Guerra</th><th>Motivo</th><th>Ofício SEI</th><th>Serviço</th><th>Protocolo</th>
      </tr>
    </thead>
    <tbody>${linhas || "<tr><td colspan='7' style='text-align:center;padding:20px;color:#94a3b8;'>Nenhum registro encontrado para este período.</td></tr>"}</tbody>
  </table>
  <div class="rodape">Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")} — Sistema CPI-7</div>
  <br/>
  <button onclick="window.print()" style="padding:8px 20px;background:#1e3a5f;color:white;border:none;border-radius:4px;cursor:pointer;font-size:14px;">🖨️ Imprimir</button>
</body>
</html>`;

            const janela = window.open("", "_blank");
            if (janela) {
                janela.document.write(html);
                janela.document.close();
            }
            setOpen(false);
            resetar();
        });
    }

    return (
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetar(); }}>
            <DialogTrigger asChild>
                <Button className="bg-pm-blue hover:bg-blue-800 text-white">
                    <FileBarChart className="mr-2 h-4 w-4" />
                    Relatórios
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-pm-blue">
                        <FileBarChart className="h-5 w-5" />
                        Gerar Relatório
                    </DialogTitle>
                    <DialogDescription>
                        {etapa === "tipo"
                            ? "Selecione o tipo de relatório que deseja gerar."
                            : "Defina o período do relatório."}
                    </DialogDescription>
                </DialogHeader>

                {etapa === "tipo" && (
                    <div className="space-y-4 pt-2">
                        <div className="space-y-2">
                            <Label>Tipo de Relatório</Label>
                            <Select value={tipo} onValueChange={(v) => setTipo(v as TipoRelatorio)}>
                                <SelectTrigger className="h-11">
                                    <SelectValue placeholder="Selecione o tipo..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Realizado">✅ Funcionais Realizadas</SelectItem>
                                    <SelectItem value="Cancelado">❌ Cancelamentos por Ausência</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                            <Button
                                onClick={handleTipoConfirmado}
                                disabled={!tipo}
                                className="bg-pm-blue hover:bg-blue-800 text-white"
                            >
                                Avançar
                            </Button>
                        </div>
                    </div>
                )}

                {etapa === "periodo" && (
                    <div className="space-y-4 pt-2">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label htmlFor="data-inicio">Data Inicial</Label>
                                <Input
                                    id="data-inicio"
                                    type="date"
                                    value={dataInicio}
                                    onChange={(e) => setDataInicio(e.target.value)}
                                    className="h-11"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="data-fim">Data Final</Label>
                                <Input
                                    id="data-fim"
                                    type="date"
                                    value={dataFim}
                                    onChange={(e) => setDataFim(e.target.value)}
                                    min={dataInicio}
                                    className="h-11"
                                />
                            </div>
                        </div>
                        <div className="flex justify-between gap-3 pt-2">
                            <Button variant="outline" onClick={() => setEtapa("tipo")}>Voltar</Button>
                            <Button
                                onClick={handleGerarRelatorio}
                                disabled={isPending || !dataInicio || !dataFim}
                                className="bg-pm-blue hover:bg-blue-800 text-white"
                            >
                                {isPending ? "Gerando..." : "Gerar Relatório"}
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
