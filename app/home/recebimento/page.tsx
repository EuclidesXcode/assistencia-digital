import Link from "next/link";

const CARDS = [
  {
    href: "/home/recebimento/com-nf",
    title: "Recebimento com NF",
    description: "Fluxo para itens vinculados a Codigo NF e consulta do produto cadastrado.",
    accent: "bg-indigo-50 border-indigo-200 text-indigo-800",
  },
  {
    href: "/home/recebimento/sem-nf",
    title: "Recebimento sem NF",
    description: "Fluxo para itens sem Codigo NF, usando o mesmo controle de lote e fotos.",
    accent: "bg-sky-50 border-sky-200 text-sky-800",
  },
];

export default function RecebimentoPage() {
  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 rounded-3xl border bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Recebimento</p>
          <h1 className="mt-2 text-3xl font-black text-slate-900">Escolha o fluxo de entrada</h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-600">
            Ambos os fluxos agora usam a tabela <code>recebimentos</code>. Selecione o tipo correto para abrir o lote e continuar o recebimento.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {CARDS.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="group rounded-3xl border bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${card.accent}`}>
                Abrir fluxo
              </div>
              <h2 className="mt-4 text-2xl font-black text-slate-900">{card.title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">{card.description}</p>
              <div className="mt-6 text-sm font-semibold text-slate-900 group-hover:text-indigo-700">Entrar</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
