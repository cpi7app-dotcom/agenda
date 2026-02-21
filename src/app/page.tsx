import { redirect } from "next/navigation";

export default function Home() {
  // Redireciona a página principal direto para o dashboard,
  // o que fará com que o Clerk automaticamente exija o login se o usuário não estiver autenticado.
  redirect("/dashboard");
}
