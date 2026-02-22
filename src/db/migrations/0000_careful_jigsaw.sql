CREATE TABLE `agendamentos` (
	`id` text PRIMARY KEY NOT NULL,
	`solicitante_id` text NOT NULL,
	`data_hora` integer NOT NULL,
	`motivo` text NOT NULL,
	`status` text DEFAULT 'Agendado' NOT NULL,
	`por_intermedio_servico` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `bloqueios` (
	`id` text PRIMARY KEY NOT NULL,
	`inicio` integer NOT NULL,
	`fim` integer NOT NULL,
	`motivo` text NOT NULL,
	`criado_por_id` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `notificacoes` (
	`id` text PRIMARY KEY NOT NULL,
	`usuario_id` text NOT NULL,
	`mensagem` text NOT NULL,
	`lida` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `usuarios_info` (
	`id` text PRIMARY KEY NOT NULL,
	`re` text NOT NULL,
	`email` text,
	`nome_guerra` text NOT NULL,
	`opm` text NOT NULL,
	`numero_oficio_sei` text DEFAULT 'Sem ofício' NOT NULL,
	`role` text DEFAULT 'user' NOT NULL,
	`posto_graduacao` text NOT NULL,
	`created_at` integer NOT NULL
);
