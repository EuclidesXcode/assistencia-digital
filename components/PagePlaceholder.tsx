"use client";

import { Clock } from "lucide-react";

type PagePlaceholderProps = {
  title: string;
  subtitle?: string;
};

export default function PagePlaceholder({ title, subtitle }: PagePlaceholderProps) {
  const helperText = subtitle || "Implementacao em breve.";

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/80 border-b border-slate-200/50 px-8 py-4 flex items-center justify-between shadow-sm transition-all duration-200">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">{title}</h1>
          <p className="text-slate-500 font-medium text-sm">{helperText}</p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-8">
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl p-16 text-center">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-100">
            <Clock className="w-10 h-10 text-slate-300" />
          </div>
          <h2 className="text-xl font-black text-slate-900 mb-2">Implementacao em breve</h2>
          <p className="text-slate-500 font-medium">
            Esta area esta em implementacao. Em breve teremos novidades.
          </p>
        </div>
      </div>
    </div>
  );
}
