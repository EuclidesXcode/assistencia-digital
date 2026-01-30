"use client";

import React from "react";
import { ChevronDown } from "lucide-react";

export type ScreenKey =
  | "dashboard"
  | "recebimento"
  | "recebimento_com_nf"
  | "recebimento_sem_nf"
  | "pre_analise"
  | "analise_tecnica"
  | "endereco"
  | "conserto"
  | "qualidade"
  | "embalagem"
  | "expedicao"
  | "cadastro_produtos"
  | "orcamento"
  | "verificar_disponibilidade"
  | "cadastro_empresas"
  | "cadastro_clientes"
  | "cadastro_usuario";

export type Group = "GERAL" | "PRODUCAO" | "ADMINISTRATIVO" | "ADMIN";

export type Screen = {
  key: ScreenKey;
  label: string;
  group: Group;
  icon: React.ElementType;
};

export type MenuData = {
  dashboard?: Screen;
  recebimento?: Screen;
  producao: Screen[];
  administrativo: Screen[];
  admin: Screen[];
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 pt-3 pb-2 text-[11px] font-semibold tracking-wide text-slate-500">
      {children}
    </div>
  );
}

function NavItem({
  item,
  active,
  sidebarMini,
  onClick,
  compact,
}: {
  item: Screen;
  active: boolean;
  sidebarMini: boolean;
  onClick: () => void;
  compact?: boolean;
}) {
  const Icon = item.icon;
  return (
    <button
      onClick={onClick}
      className={[
        "w-full flex items-center gap-3 rounded-xl px-3 py-2 transition",
        compact ? "text-[13px]" : "text-sm",
        active ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50",
      ].join(" ")}
      title={sidebarMini ? item.label : undefined}
    >
      <Icon className={"h-5 w-5 " + (active ? "text-indigo-600" : "text-slate-400")} />
      {!sidebarMini ? (
        <span className={"truncate " + (active ? "font-semibold" : "font-medium")}>
          {item.label}
        </span>
      ) : null}
    </button>
  );
}

function SubItem({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "w-full flex items-center gap-2 rounded-xl px-3 py-2 text-[13px] transition",
        active ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50",
      ].join(" ")}
    >
      <span className={"h-1.5 w-1.5 rounded-full ml-0.5 " + (active ? "bg-indigo-600" : "bg-slate-300")} />
      <span className={"truncate " + (active ? "font-semibold" : "font-medium")}>{label}</span>
    </button>
  );
}

export default function Sidebar({
  systemName,
  systemDot,
  screens,
  menu,
  screen,
  setScreen,
  can,
  sidebarMini,
  recebimentoOpen,
  setRecebimentoOpen,
}: {
  systemName: string;
  systemDot: string;
  screens: Screen[];
  menu: MenuData;
  screen: ScreenKey;
  setScreen: (k: ScreenKey) => void;
  can: (k: ScreenKey) => boolean;
  sidebarMini: boolean;
  recebimentoOpen: boolean;
  setRecebimentoOpen: (v: boolean | ((s: boolean) => boolean)) => void;
}) {
  const recebimentoCan = can("recebimento") || can("recebimento_com_nf") || can("recebimento_sem_nf");
  const recebimentoItem = menu.recebimento;
  const RecebimentoIcon = recebimentoItem?.icon;
  const recebimentoComItem = screens.find((it) => it.key === "recebimento_com_nf");
  const recebimentoSemItem = screens.find((it) => it.key === "recebimento_sem_nf");

  const activeGroup =
    screen === "recebimento" || screen === "recebimento_com_nf" || screen === "recebimento_sem_nf";

  return (
    <aside className={["shrink-0 border-r bg-white min-h-screen", sidebarMini ? "w-[78px]" : "w-[300px]"].join(" ")}>
      <div className="h-16 px-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center overflow-hidden">
          <span className="font-bold">{(systemName[0] || "G").toUpperCase()}</span>
        </div>
        {!sidebarMini ? <div className="truncate text-sm font-semibold text-slate-900">{systemDot}</div> : null}
      </div>

      <nav className="px-3 pb-3">
        <div className="grid gap-1">
          {can("dashboard") && menu.dashboard ? (
            <NavItem
              item={menu.dashboard}
              active={screen === "dashboard"}
              sidebarMini={sidebarMini}
              onClick={() => setScreen("dashboard")}
            />
          ) : null}
        </div>

        {!sidebarMini ? <SectionTitle>Producao</SectionTitle> : <div className="h-3" />}
        <div className="grid gap-1">
          {/* Recebimento (accordion) */}
          {recebimentoItem && recebimentoCan && RecebimentoIcon ? (
            <div className="grid gap-1">
              {sidebarMini ? (
                <>
                  {recebimentoComItem && can("recebimento_com_nf") ? (
                    <NavItem
                      item={recebimentoComItem}
                      active={screen === "recebimento_com_nf"}
                      sidebarMini={sidebarMini}
                      onClick={() => setScreen("recebimento_com_nf")}
                      compact
                    />
                  ) : null}
                  {recebimentoSemItem && can("recebimento_sem_nf") ? (
                    <NavItem
                      item={recebimentoSemItem}
                      active={screen === "recebimento_sem_nf"}
                      sidebarMini={sidebarMini}
                      onClick={() => setScreen("recebimento_sem_nf")}
                      compact
                    />
                  ) : null}
                </>
              ) : (
                <>
                  <button
                    onClick={() => setRecebimentoOpen((s) => !s)}
                    className={[
                      "w-full flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition",
                      activeGroup ? "text-indigo-700" : "text-slate-600 hover:bg-slate-50",
                    ].join(" ")}
                    title={sidebarMini ? "01 - Recebimento" : undefined}
                  >
                    <RecebimentoIcon className={"h-5 w-5 " + (activeGroup ? "text-indigo-600" : "text-slate-400")} />
                    <>
                      <span className={"truncate " + (activeGroup ? "font-semibold" : "font-medium")}>
                        01 - Recebimento
                      </span>
                      <ChevronDown
                        className={
                          "h-4 w-4 ml-auto transition " +
                          (recebimentoOpen ? "rotate-180 text-slate-500" : "text-slate-400")
                        }
                      />
                    </>
                  </button>

                  {recebimentoOpen ? (
                    <div className="ml-8 grid gap-1">
                      {can("recebimento_com_nf") ? (
                        <SubItem
                          active={screen === "recebimento_com_nf"}
                          onClick={() => setScreen("recebimento_com_nf")}
                          label="Com NF"
                        />
                      ) : null}
                      {can("recebimento_sem_nf") ? (
                        <SubItem
                          active={screen === "recebimento_sem_nf"}
                          onClick={() => setScreen("recebimento_sem_nf")}
                          label="Sem NF"
                        />
                      ) : null}
                    </div>
                  ) : null}
                </>
              )}
            </div>
          ) : null}

          {menu.producao.map((it) => (
            <NavItem
              key={it.key}
              item={it}
              active={screen === it.key}
              sidebarMini={sidebarMini}
              onClick={() => setScreen(it.key)}
            />
          ))}
        </div>

        {!sidebarMini ? <SectionTitle>Administrativo</SectionTitle> : <div className="h-3" />}
        <div className="grid gap-1">
          {menu.administrativo.map((it) => (
            <NavItem
              key={it.key}
              item={it}
              active={screen === it.key}
              sidebarMini={sidebarMini}
              onClick={() => setScreen(it.key)}
            />
          ))}
        </div>

        {!sidebarMini ? <SectionTitle>Admin</SectionTitle> : <div className="h-3" />}
        <div className="grid gap-1">
          {menu.admin.map((it) => (
            <NavItem
              key={it.key}
              item={it}
              active={screen === it.key}
              sidebarMini={sidebarMini}
              onClick={() => setScreen(it.key)}
            />
          ))}
        </div>
      </nav>
    </aside>
  );
}
