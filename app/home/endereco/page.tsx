"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, MapPin, Pencil, Search, Trash2, UserRound } from "lucide-react";
import { ClientApiService, ClientRecord } from "@/lib/clientApiService";
import { CompanyApiService, CompanyRecord } from "@/lib/companyApiService";

const sectionCardClass = "bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-5 space-y-4";
const inputClass =
  "h-10 rounded-xl border border-slate-300 bg-white px-3 text-[12px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500";

function norm(value: unknown) {
  return String(value || "").trim();
}

function upper(value: unknown) {
  return norm(value).toUpperCase();
}

function formatAddress(address?: {
  street?: string;
  number?: string;
  complement?: string;
  district?: string;
  city?: string;
  state?: string;
}) {
  if (!address) return "-";
  const line1 = [address.street, address.number].filter(Boolean).join(", ");
  const line2 = [address.complement, address.district].filter(Boolean).join(" - ");
  const line3 = [address.city, address.state].filter(Boolean).join(" / ");
  return [line1, line2, line3].filter(Boolean).join(" | ") || "-";
}

function getClientName(client: ClientRecord) {
  return norm(client.nome || client.tradeName || client.legalName || client.fullName);
}

function getCompanyName(company: CompanyRecord) {
  return norm(company.tradeName || company.legalName);
}

type AddressFormState = {
  zipCode: string;
  street: string;
  number: string;
  complement: string;
  district: string;
  city: string;
  state: string;
  mainEmail: string;
  mainMobile: string;
  mainPhone: string;
};

const emptyAddressForm: AddressFormState = {
  zipCode: "",
  street: "",
  number: "",
  complement: "",
  district: "",
  city: "",
  state: "",
  mainEmail: "",
  mainMobile: "",
  mainPhone: "",
};

function toAddressForm(address?: ClientRecord["address"] | CompanyRecord["address"] | null): AddressFormState {
  return {
    zipCode: norm(address?.zipCode),
    street: norm(address?.street),
    number: norm(address?.number),
    complement: norm(address?.complement),
    district: norm(address?.district),
    city: norm(address?.city),
    state: norm(address?.state),
    mainEmail: norm(address?.mainEmail),
    mainMobile: norm(address?.mainMobile),
    mainPhone: norm(address?.mainPhone),
  };
}

type FichaState =
  | { kind: "client"; client: ClientRecord }
  | { kind: "company"; company: CompanyRecord }
  | null;

export default function EnderecoPage() {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [companies, setCompanies] = useState<CompanyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchClients, setSearchClients] = useState("");
  const [searchCompanies, setSearchCompanies] = useState("");

  const [ficha, setFicha] = useState<FichaState>(null);
  const [fichaEditing, setFichaEditing] = useState(false);
  const [fichaAddress, setFichaAddress] = useState<AddressFormState>(emptyAddressForm);
  const [fichaBusy, setFichaBusy] = useState(false);
  const [fichaMessage, setFichaMessage] = useState("");

  useEffect(() => {
    let active = true;
    const loadAll = async () => {
      try {
        setLoading(true);
        const [clientData, companyData] = await Promise.all([ClientApiService.listClients(), CompanyApiService.listCompanies()]);
        if (!active) return;
        setClients(Array.isArray(clientData) ? clientData : []);
        setCompanies(Array.isArray(companyData) ? companyData : []);
        setError("");
      } catch (loadError: any) {
        if (!active) return;
        setError(String(loadError?.message || "Falha ao carregar enderecos."));
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadAll();
    return () => {
      active = false;
    };
  }, []);

  const filteredClients = useMemo(() => {
    const q = upper(searchClients);
    if (!q) return clients;
    return clients.filter((client) =>
      upper([getClientName(client), client.cnpj, client.cpf, client.address?.zipCode, client.address?.street, client.address?.district, client.address?.city, client.address?.state].filter(Boolean).join(" ")).includes(q)
    );
  }, [clients, searchClients]);

  const filteredCompanies = useMemo(() => {
    const q = upper(searchCompanies);
    if (!q) return companies;
    return companies.filter((company) =>
      upper([getCompanyName(company), company.cnpj, company.owner?.fullName, company.owner?.cpf, company.address?.zipCode, company.address?.street, company.address?.district, company.address?.city, company.address?.state].filter(Boolean).join(" ")).includes(q)
    );
  }, [companies, searchCompanies]);

  const openClientFicha = (client: ClientRecord) => {
    setFicha({ kind: "client", client });
    setFichaEditing(false);
    setFichaAddress(toAddressForm(client.address));
    setFichaMessage("");
  };

  const openCompanyFicha = (company: CompanyRecord) => {
    setFicha({ kind: "company", company });
    setFichaEditing(false);
    setFichaAddress(toAddressForm(company.address));
    setFichaMessage("");
  };

  const closeFicha = () => {
    if (fichaBusy) return;
    setFicha(null);
    setFichaEditing(false);
    setFichaMessage("");
  };

  const updateFichaAddressField = (field: keyof AddressFormState, value: string) => {
    setFichaAddress((prev) => ({ ...prev, [field]: value }));
    setFichaMessage("");
  };

  const saveFicha = async () => {
    if (!ficha) return;
    try {
      setFichaBusy(true);
      setFichaMessage("");
      if (ficha.kind === "client") {
        const current = ficha.client;
        const updated = await ClientApiService.updateClient(current.id, {
          personType: current.personType,
          fullName: current.fullName,
          cpf: current.cpf,
          rg: current.rg,
          birthDate: current.birthDate,
          legalName: current.legalName,
          tradeName: current.tradeName,
          cnpj: current.cnpj,
          stateRegistration: current.stateRegistration,
          municipalRegistration: current.municipalRegistration,
          businessActivity: current.businessActivity,
          cnae: current.cnae,
          address: { ...fichaAddress },
        });
        setClients((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        setFicha({ kind: "client", client: updated });
        setFichaAddress(toAddressForm(updated.address));
      } else {
        const current = ficha.company;
        const updated = await CompanyApiService.updateCompany(current.id, {
          legalName: current.legalName,
          tradeName: current.tradeName,
          cnpj: current.cnpj,
          stateRegistration: current.stateRegistration,
          municipalRegistration: current.municipalRegistration,
          businessActivity: current.businessActivity,
          cnae: current.cnae,
          owner: {
            fullName: norm(current.owner?.fullName),
            cpf: norm(current.owner?.cpf),
            rg: norm(current.owner?.rg),
            birthDate: norm(current.owner?.birthDate),
          },
          address: { ...fichaAddress },
        });
        setCompanies((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        setFicha({ kind: "company", company: updated });
        setFichaAddress(toAddressForm(updated.address));
      }
      setFichaEditing(false);
      setFichaMessage("Endereco atualizado com sucesso.");
    } catch (saveError: any) {
      setFichaMessage(String(saveError?.message || "Falha ao salvar endereco."));
    } finally {
      setFichaBusy(false);
    }
  };

  const deleteFromFicha = async () => {
    if (!ficha) return;
    const label = ficha.kind === "client" ? getClientName(ficha.client) : getCompanyName(ficha.company);
    if (!window.confirm(`Excluir cadastro "${label}"?`)) return;
    try {
      setFichaBusy(true);
      if (ficha.kind === "client") {
        const id = ficha.client.id;
        await ClientApiService.deleteClient(id);
        setClients((prev) => prev.filter((item) => item.id !== id));
      } else {
        const id = ficha.company.id;
        await CompanyApiService.deleteCompany(id);
        setCompanies((prev) => prev.filter((item) => item.id !== id));
      }
      setFicha(null);
      setFichaEditing(false);
      setFichaMessage("");
    } catch (deleteError: any) {
      setFichaMessage(String(deleteError?.message || "Falha ao excluir cadastro."));
    } finally {
      setFichaBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="w-full min-w-0 px-4 md:px-6 py-4">
        <div className="mx-auto w-full max-w-[1400px] min-w-0 space-y-4">
          <section className={sectionCardClass}>
            <div className="flex items-center gap-2 text-slate-800"><MapPin size={18} /><h1 className="text-xl font-semibold text-slate-900">Enderecos</h1></div>
            <p className="text-[12px] text-slate-500">Consulta de enderecos cadastrados, separados por clientes e empresas.</p>
          </section>
          {error ? <section className={sectionCardClass}><div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">{error}</div></section> : null}

          <section className={sectionCardClass}>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2 text-slate-800"><UserRound size={18} /><h2 className="text-sm font-semibold">Enderecos de Clientes</h2></div>
              <div className="w-full md:w-80 relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input className={`${inputClass} pl-9 w-full`} value={searchClients} onChange={(e) => setSearchClients(e.target.value)} placeholder="Pesquisar cliente ou endereco" /></div>
            </div>
            <div className="space-y-3">
              {loading ? <div className="rounded-2xl border border-slate-200 bg-white px-3 py-4 text-center text-[12px] text-slate-400">Carregando enderecos de clientes...</div> : filteredClients.length === 0 ? <div className="rounded-2xl border border-slate-200 bg-white px-3 py-4 text-center text-[12px] text-slate-400">Nenhum endereco de cliente encontrado.</div> : filteredClients.map((client) => <button key={client.id} type="button" onClick={() => openClientFicha(client)} className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-left hover:border-sky-200"><div className="space-y-2"><div className="text-sm font-semibold text-slate-800">{getClientName(client)}</div><div className="text-[12px] text-slate-700"><span className="text-slate-400 uppercase tracking-wide">Endereco: </span>{formatAddress(client.address || undefined)}</div></div></button>)}
            </div>
          </section>

          <section className={sectionCardClass}>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2 text-slate-800"><Building2 size={18} /><h2 className="text-sm font-semibold">Enderecos de Empresas</h2></div>
              <div className="w-full md:w-80 relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input className={`${inputClass} pl-9 w-full`} value={searchCompanies} onChange={(e) => setSearchCompanies(e.target.value)} placeholder="Pesquisar empresa ou endereco" /></div>
            </div>
            <div className="space-y-3">
              {loading ? <div className="rounded-2xl border border-slate-200 bg-white px-3 py-4 text-center text-[12px] text-slate-400">Carregando enderecos de empresas...</div> : filteredCompanies.length === 0 ? <div className="rounded-2xl border border-slate-200 bg-white px-3 py-4 text-center text-[12px] text-slate-400">Nenhum endereco de empresa encontrado.</div> : filteredCompanies.map((company) => <button key={company.id} type="button" onClick={() => openCompanyFicha(company)} className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-left hover:border-sky-200"><div className="space-y-2"><div className="text-sm font-semibold text-slate-800">{getCompanyName(company)}</div><div className="text-[12px] text-slate-700"><span className="text-slate-400 uppercase tracking-wide">Endereco: </span>{formatAddress(company.address || undefined)}</div></div></button>)}
            </div>
          </section>

          {ficha ? (
            <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4" onClick={closeFicha}>
              <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-4 md:p-5 shadow-2xl space-y-4" onClick={(event) => event.stopPropagation()}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold text-slate-900">{ficha.kind === "client" ? "Ficha - Endereco de Cliente" : "Ficha - Endereco de Empresa"}</div>
                    <div className="text-[12px] text-slate-500">{ficha.kind === "client" ? getClientName(ficha.client) : getCompanyName(ficha.company)}</div>
                  </div>
                  <button type="button" onClick={closeFicha} className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-3 h-9 text-[11px] font-semibold text-slate-700 hover:bg-slate-50">FECHAR</button>
                </div>

                {!fichaEditing ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[12px] text-slate-700">
                    <div><div className="text-slate-400 uppercase tracking-wide">Documento</div><div>{ficha.kind === "client" ? ficha.client.cnpj || ficha.client.cpf || "-" : ficha.company.cnpj || "-"}</div></div>
                    <div><div className="text-slate-400 uppercase tracking-wide">CEP</div><div>{fichaAddress.zipCode || "-"}</div></div>
                    <div className="md:col-span-2"><div className="text-slate-400 uppercase tracking-wide">Endereco</div><div>{formatAddress(fichaAddress)}</div></div>
                    <div className="md:col-span-2"><div className="text-slate-400 uppercase tracking-wide">Contato</div><div>{fichaAddress.mainMobile || fichaAddress.mainPhone || fichaAddress.mainEmail || "-"}</div></div>
                  </div>
                ) : (
                  <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-12 md:col-span-2 flex flex-col gap-1"><label className="text-[11px] font-medium text-slate-600 tracking-wide">CEP</label><input className={inputClass} value={fichaAddress.zipCode} onChange={(e) => updateFichaAddressField("zipCode", e.target.value)} /></div>
                    <div className="col-span-12 md:col-span-5 flex flex-col gap-1"><label className="text-[11px] font-medium text-slate-600 tracking-wide">RUA</label><input className={inputClass} value={fichaAddress.street} onChange={(e) => updateFichaAddressField("street", e.target.value)} /></div>
                    <div className="col-span-12 md:col-span-2 flex flex-col gap-1"><label className="text-[11px] font-medium text-slate-600 tracking-wide">NUMERO</label><input className={inputClass} value={fichaAddress.number} onChange={(e) => updateFichaAddressField("number", e.target.value)} /></div>
                    <div className="col-span-12 md:col-span-3 flex flex-col gap-1"><label className="text-[11px] font-medium text-slate-600 tracking-wide">COMPLEMENTO</label><input className={inputClass} value={fichaAddress.complement} onChange={(e) => updateFichaAddressField("complement", e.target.value)} /></div>
                    <div className="col-span-12 md:col-span-3 flex flex-col gap-1"><label className="text-[11px] font-medium text-slate-600 tracking-wide">BAIRRO</label><input className={inputClass} value={fichaAddress.district} onChange={(e) => updateFichaAddressField("district", e.target.value)} /></div>
                    <div className="col-span-12 md:col-span-3 flex flex-col gap-1"><label className="text-[11px] font-medium text-slate-600 tracking-wide">CIDADE</label><input className={inputClass} value={fichaAddress.city} onChange={(e) => updateFichaAddressField("city", e.target.value)} /></div>
                    <div className="col-span-12 md:col-span-1 flex flex-col gap-1"><label className="text-[11px] font-medium text-slate-600 tracking-wide">UF</label><input className={inputClass} value={fichaAddress.state} onChange={(e) => updateFichaAddressField("state", e.target.value)} /></div>
                    <div className="col-span-12 md:col-span-5 flex flex-col gap-1"><label className="text-[11px] font-medium text-slate-600 tracking-wide">E-MAIL PRINCIPAL</label><input className={inputClass} value={fichaAddress.mainEmail} onChange={(e) => updateFichaAddressField("mainEmail", e.target.value)} /></div>
                    <div className="col-span-12 md:col-span-3 flex flex-col gap-1"><label className="text-[11px] font-medium text-slate-600 tracking-wide">CELULAR PRINCIPAL</label><input className={inputClass} value={fichaAddress.mainMobile} onChange={(e) => updateFichaAddressField("mainMobile", e.target.value)} /></div>
                    <div className="col-span-12 md:col-span-3 flex flex-col gap-1"><label className="text-[11px] font-medium text-slate-600 tracking-wide">TELEFONE PRINCIPAL</label><input className={inputClass} value={fichaAddress.mainPhone} onChange={(e) => updateFichaAddressField("mainPhone", e.target.value)} /></div>
                  </div>
                )}

                {fichaMessage ? <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-slate-700">{fichaMessage}</div> : null}

                <div className="flex flex-wrap justify-end gap-2">
                  {!fichaEditing ? <button type="button" onClick={() => setFichaEditing(true)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 h-9 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"><Pencil size={14} />EDITAR ENDERECO</button> : <button type="button" onClick={() => { setFichaEditing(false); const currentAddress = ficha.kind === "client" ? ficha.client.address : ficha.company.address; setFichaAddress(toAddressForm(currentAddress)); setFichaMessage(""); }} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 h-9 text-[11px] font-semibold text-slate-700 hover:bg-slate-50">CANCELAR EDICAO</button>}
                  {fichaEditing ? <button type="button" onClick={() => void saveFicha()} disabled={fichaBusy} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-900 bg-slate-900 px-3 h-9 text-[11px] font-semibold text-white hover:bg-slate-800 disabled:opacity-50">{fichaBusy ? "SALVANDO" : "SALVAR ENDERECO"}</button> : null}
                  <button type="button" onClick={() => void deleteFromFicha()} disabled={fichaBusy} className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 h-9 text-[11px] font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"><Trash2 size={14} />{fichaBusy ? "PROCESSANDO" : "EXCLUIR CADASTRO"}</button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
