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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { criarEncaixe } from "@/server/actions/agendamentos";
import { toast } from "sonner";
import { Zap } from "lucide-react";

export function DialogEncaixe() {
    const [open, setOpen] = useState(false);
    const [motivo, setMotivo] = useState("");
    const [isPending, startTransition] = useTransition();

    function handleConfirmar() {
        startTransition(async () => {
            const res = await criarEncaixe(motivo);
            if (res.success) {
                toast.success(`${res.message} — Protocolo: ${res.protocolo}`);
                setOpen(false);
                setMotivo("");
            } else {
                toast.error(res.message);
            }
        });
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="border-amber-500 text-amber-600 hover:bg-amber-50 hover:text-amber-700">
                    <Zap className="mr-2 h-4 w-4" />
                    Encaixe
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-amber-600">
                        <Zap className="h-5 w-5" />
                        Registrar Encaixe
                    </DialogTitle>
                    <DialogDescription>
                        Cria um agendamento imediato para <strong>agora</strong>, ignorando as restrições de horário. Use para atendimentos presenciais urgentes.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                        <Label htmlFor="motivo-encaixe">Motivo</Label>
                        <Input
                            id="motivo-encaixe"
                            placeholder="Ex: Promoção, Extravio, Atendimento presencial..."
                            value={motivo}
                            onChange={(e) => setMotivo(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleConfirmar()}
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <Button variant="outline" onClick={() => setOpen(false)}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleConfirmar}
                            disabled={isPending || motivo.length < 2}
                            className="bg-amber-500 hover:bg-amber-600 text-white"
                        >
                            {isPending ? "Registrando..." : "Confirmar Encaixe"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
