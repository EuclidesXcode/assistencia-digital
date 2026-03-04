"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, MapPin, Pencil, Save, Search, Trash2, UserRound } from "lucide-react";
import { CompanyApiService, CompanyRecord, CreateCompanyInput } from "@/lib/companyApiService";

const sectionCardClass = "bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-5 space-y-4";
const panelClass = "rounded-2xl border border-slate-200 overflow-x-auto bg-white";
const inputClass =
  "h-10 rounded-xl border border-slate-300 bg-white px-3 text-[12px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500";

type CompanyFormState = CreateCompanyInput & {
  owner: NonNullable<CreateCompanyInput["owner"]>;
  address: NonNullable<CreateCompanyInput["address"]>;
};

function norm(value: unknown) {
  return String(value || "").trim();
}

function upper(value: unknown) {
  return norm(value).toUpperCase();
}

function buildInitialForm(): CompanyFormState {
  return {
    legalName: "",
    tradeName: "",
    cnpj: "",
    stateRegistration: "",
    municipalRegistration: "",
    businessActivity: "",
    cnae: "",
    owner: {
      fullName: "",
      cpf: "",
      rg: "",
      birthDate: "",
    },
    address: {
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
    },
  };
}

function buildFormFromCompany(company: CompanyRecord): CompanyFormState {
  return {
    legalName: norm(company.legalName),
    tradeName: norm(company.tradeName),
    cnpj: norm(company.cnpj),
    stateRegistration: norm(company.stateRegistration),
    municipalRegistration: norm(company.municipalRegistration),
    businessActivity: norm(company.businessActivity),
    cnae: norm(company.cnae),
    owner: {
      fullName: norm(company.owner?.fullName),
      cpf: norm(company.owner?.cpf),
      rg: norm(company.owner?.rg),
      birthDate: norm(company.owner?.birthDate),
    },
    address: {
      zipCode: norm(company.address?.zipCode),
      street: norm(company.address?.street),
      number: norm(company.address?.number),
      complement: norm(company.address?.complement),
      district: norm(company.address?.district),
      city: norm(company.address?.city),
      state: norm(company.address?.state),
      mainEmail: norm(company.address?.mainEmail),
      mainMobile: norm(company.address?.mainMobile),
      mainPhone: norm(company.address?.mainPhone),
    },
  };
}

function getCompanyDisplayName(company: CompanyRecord) {
  return norm(company.tradeName || company.legalName);
}

export default function CadastroEmpresasPage() {
  const [form, setForm] = useState<CompanyFormState>(() => buildInitialForm());
  const [companies, setCompanies] = useState<CompanyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);
  const [deletingCompanyId, setDeletingCompanyId] = useState<string | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<CompanyRecord | null>(null);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [loadError, setLoadError] = useState("");

  const loadCompanies = async () => {
    try {
      setLoading(true);
      const data = await CompanyApiService.listCompanies();
      setCompanies(Array.isArray(data) ? data : []);
      setLoadError("");
    } catch (error: any) {
      console.error("Falha ao carregar empresas:", error);
      setLoadError(String(error?.message || "Falha ao carregar empresas."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCompanies();
  }, []);

  const filteredCompanies = useMemo(() => {
    const q = upper(search);
    if (!q) return companies;

    return companies.filter((company) => {
      const haystack = [
        getCompanyDisplayName(company),
        company.legalName,
        company.cnpj,
        company.owner?.fullName,
        company.owner?.cpf,
        company.address?.city,
        company.address?.state,
      ]
        .filter(Boolean)
        .join(" ");

      return upper(haystack).includes(q);
    });
  }, [companies, search]);

  const updateField = (field: keyof CompanyFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setMessage("");
  };

  const updateOwnerField = (field: keyof CompanyFormState["owner"], value: string) => {
    setForm((prev) => ({
      ...prev,
      owner: {
        ...prev.owner,
        [field]: value,
      },
    }));
    setMessage("");
  };

  const updateAddressField = (field: keyof CompanyFormState["address"], value: string) => {
    setForm((prev) => ({
      ...prev,
      address: {
        ...prev.address,
        [field]: value,
      },
    }));
    setMessage("");
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);
      setMessage("");

      const payload: CreateCompanyInput = {
        ...form,
        owner: { ...form.owner },
        address: { ...form.address },
      };

      const saved = editingCompanyId
        ? await CompanyApiService.updateCompany(editingCompanyId, payload)
        : await CompanyApiService.createCompany(payload);

      setCompanies((prev) => {
        const withoutCurrent = prev.filter((item) => item.id !== saved.id);
        return [saved, ...withoutCurrent];
      });
      setEditingCompanyId(null);
      setForm(buildInitialForm());
      setMessage(editingCompanyId ? "Empresa alterada com sucesso." : "Empresa cadastrada com sucesso.");
    } catch (error: any) {
      console.error("Falha ao salvar empresa:", error);
      setMessage(String(error?.message || "Falha ao salvar empresa."));
    } finally {
      setSaving(false);
    }
  };

  const handleStartEdit = (company: CompanyRecord) => {
    setEditingCompanyId(company.id);
    setForm(buildFormFromCompany(company));
    setMessage("Empresa carregada para alteracao.");
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleCancelEdit = () => {
    setEditingCompanyId(null);
    setForm(buildInitialForm());
    setMessage("");
  };

  const handleDelete = async (company: CompanyRecord) => {
    const confirmText = `Excluir empresa "${getCompanyDisplayName(company)}"?`;
    if (!window.confirm(confirmText)) return;

    try {
      setDeletingCompanyId(company.id);
      await CompanyApiService.deleteCompany(company.id);
      setCompanies((prev) => prev.filter((item) => item.id !== company.id));
      if (editingCompanyId === company.id) {
        setEditingCompanyId(null);
        setForm(buildInitialForm());
      }
      setMessage("Empresa excluida com sucesso.");
    } catch (error: any) {
      console.error("Falha ao excluir empresa:", error);
      setMessage(String(error?.message || "Falha ao excluir empresa."));
    } finally {
      setDeletingCompanyId(null);
    }
  };

  const handleDeleteFromFicha = async () => {
    if (!selectedCompany) return;
    const targetId = selectedCompany.id;
    await handleDelete(selectedCompany);
    setSelectedCompany((prev) => (prev?.id === targetId ? null : prev));
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="w-full min-w-0 px-4 md:px-6 py-4">
        <div className="mx-auto w-full max-w-[1400px] min-w-0 space-y-4">
      <section className={sectionCardClass}>
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Cadastro de Empresas</h1>
          <p className="text-[12px] text-slate-500 mt-1">
            Cadastro centralizado de empresa com responsável e endereço completo.
          </p>
        </div>
      </section>

      <section className={sectionCardClass}>
        <div className="flex items-center gap-2 text-slate-800">
          <Building2 size={18} />
          <h2 className="text-sm font-semibold">Dados da Empresa</h2>
        </div>

        {editingCompanyId ? (
          <div className="rounded-2xl border border-sky-200 bg-sky-50 px-3 py-2 text-[12px] text-sky-900">
            Modo alteracao ativo. Salve para atualizar a empresa ou cancele para voltar ao cadastro novo.
          </div>
        ) : null}

        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-12 md:col-span-4 flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-slate-600 tracking-wide">RAZAO SOCIAL</label>
            <input className={inputClass} value={form.legalName || ""} onChange={(e) => updateField("legalName", e.target.value)} />
          </div>
          <div className="col-span-12 md:col-span-4 flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-slate-600 tracking-wide">NOME FANTASIA</label>
            <input className={inputClass} value={form.tradeName || ""} onChange={(e) => updateField("tradeName", e.target.value)} />
          </div>
          <div className="col-span-12 md:col-span-4 flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-slate-600 tracking-wide">CNPJ</label>
            <input className={inputClass} value={form.cnpj || ""} onChange={(e) => updateField("cnpj", e.target.value)} />
          </div>
          <div className="col-span-12 md:col-span-3 flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-slate-600 tracking-wide">INSCRICAO ESTADUAL</label>
            <input className={inputClass} value={form.stateRegistration || ""} onChange={(e) => updateField("stateRegistration", e.target.value)} />
          </div>
          <div className="col-span-12 md:col-span-3 flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-slate-600 tracking-wide">INSCRICAO MUNICIPAL</label>
            <input className={inputClass} value={form.municipalRegistration || ""} onChange={(e) => updateField("municipalRegistration", e.target.value)} />
          </div>
          <div className="col-span-12 md:col-span-3 flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-slate-600 tracking-wide">ATIVIDADE</label>
            <input className={inputClass} value={form.businessActivity || ""} onChange={(e) => updateField("businessActivity", e.target.value)} />
          </div>
          <div className="col-span-12 md:col-span-3 flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-slate-600 tracking-wide">CNAE</label>
            <input className={inputClass} value={form.cnae || ""} onChange={(e) => updateField("cnae", e.target.value)} />
          </div>
        </div>
      </section>

      <section className={sectionCardClass}>
        <div className="flex items-center gap-2 text-slate-800">
          <UserRound size={18} />
          <h2 className="text-sm font-semibold">Responsavel / Proprietario</h2>
        </div>

        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-12 md:col-span-5 flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-slate-600 tracking-wide">NOME COMPLETO</label>
            <input className={inputClass} value={form.owner.fullName || ""} onChange={(e) => updateOwnerField("fullName", e.target.value)} />
          </div>
          <div className="col-span-12 md:col-span-3 flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-slate-600 tracking-wide">CPF</label>
            <input className={inputClass} value={form.owner.cpf || ""} onChange={(e) => updateOwnerField("cpf", e.target.value)} />
          </div>
          <div className="col-span-12 md:col-span-2 flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-slate-600 tracking-wide">RG</label>
            <input className={inputClass} value={form.owner.rg || ""} onChange={(e) => updateOwnerField("rg", e.target.value)} />
          </div>
          <div className="col-span-12 md:col-span-2 flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-slate-600 tracking-wide">NASCIMENTO</label>
            <input type="date" className={inputClass} value={form.owner.birthDate || ""} onChange={(e) => updateOwnerField("birthDate", e.target.value)} />
          </div>
        </div>
      </section>

      <section className={sectionCardClass}>
        <div className="flex items-center gap-2 text-slate-800">
          <MapPin size={18} />
          <h2 className="text-sm font-semibold">Endereco e Contato da Empresa</h2>
        </div>

        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-12 md:col-span-2 flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-slate-600 tracking-wide">CEP</label>
            <input className={inputClass} value={form.address.zipCode || ""} onChange={(e) => updateAddressField("zipCode", e.target.value)} />
          </div>
          <div className="col-span-12 md:col-span-5 flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-slate-600 tracking-wide">RUA</label>
            <input className={inputClass} value={form.address.street || ""} onChange={(e) => updateAddressField("street", e.target.value)} />
          </div>
          <div className="col-span-12 md:col-span-2 flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-slate-600 tracking-wide">NUMERO</label>
            <input className={inputClass} value={form.address.number || ""} onChange={(e) => updateAddressField("number", e.target.value)} />
          </div>
          <div className="col-span-12 md:col-span-3 flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-slate-600 tracking-wide">COMPLEMENTO</label>
            <input className={inputClass} value={form.address.complement || ""} onChange={(e) => updateAddressField("complement", e.target.value)} />
          </div>
          <div className="col-span-12 md:col-span-3 flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-slate-600 tracking-wide">BAIRRO</label>
            <input className={inputClass} value={form.address.district || ""} onChange={(e) => updateAddressField("district", e.target.value)} />
          </div>
          <div className="col-span-12 md:col-span-3 flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-slate-600 tracking-wide">CIDADE</label>
            <input className={inputClass} value={form.address.city || ""} onChange={(e) => updateAddressField("city", e.target.value)} />
          </div>
          <div className="col-span-12 md:col-span-1 flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-slate-600 tracking-wide">UF</label>
            <input className={inputClass} value={form.address.state || ""} onChange={(e) => updateAddressField("state", e.target.value)} />
          </div>
          <div className="col-span-12 md:col-span-5 flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-slate-600 tracking-wide">E-MAIL PRINCIPAL</label>
            <input className={inputClass} value={form.address.mainEmail || ""} onChange={(e) => updateAddressField("mainEmail", e.target.value)} />
          </div>
          <div className="col-span-12 md:col-span-3 flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-slate-600 tracking-wide">CELULAR PRINCIPAL</label>
            <input className={inputClass} value={form.address.mainMobile || ""} onChange={(e) => updateAddressField("mainMobile", e.target.value)} />
          </div>
          <div className="col-span-12 md:col-span-3 flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-slate-600 tracking-wide">TELEFONE PRINCIPAL</label>
            <input className={inputClass} value={form.address.mainPhone || ""} onChange={(e) => updateAddressField("mainPhone", e.target.value)} />
          </div>
        </div>

        {message ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-slate-700">
            {message}
          </div>
        ) : null}

        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setEditingCompanyId(null);
              setForm(buildInitialForm());
              setMessage("");
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 h-10 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
          >
            LIMPAR
          </button>
          {editingCompanyId ? (
            <button
              type="button"
              onClick={handleCancelEdit}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 h-10 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
            >
              CANCELAR EDICAO
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 h-10 text-[11px] font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? "SALVANDO" : editingCompanyId ? "SALVAR ALTERACOES" : "SALVAR EMPRESA"}
          </button>
        </div>
      </section>

      <section className={sectionCardClass}>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Empresas Cadastradas</h2>
            <p className="text-[12px] text-slate-500 mt-1">Consulta rapida das empresas cadastradas no banco.</p>
          </div>
          <div className="w-full md:w-80 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              className={`${inputClass} pl-9 w-full`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar por empresa, CNPJ ou responsavel"
            />
          </div>
        </div>

        {loadError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">{loadError}</div>
        ) : null}

        <div className="space-y-3 md:hidden">
          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-3 py-4 text-center text-[12px] text-slate-400">
              Carregando empresas...
            </div>
          ) : filteredCompanies.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-3 py-4 text-center text-[12px] text-slate-400">
              Nenhuma empresa encontrada.
            </div>
          ) : (
            filteredCompanies.map((company) => (
              <div
                key={company.id}
                onClick={() => setSelectedCompany(company)}
                className="rounded-2xl border border-slate-200 bg-white p-3 space-y-3 cursor-pointer hover:border-sky-200"
              >
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-slate-800">{getCompanyDisplayName(company)}</div>
                  <div className="text-[11px] text-slate-500">{company.legalName || "-"}</div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-[11px] text-slate-700">
                  <div>
                    <div className="text-slate-400 uppercase tracking-wide">CNPJ</div>
                    <div>{company.cnpj || "-"}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 uppercase tracking-wide">Cidade/UF</div>
                    <div>{company.address?.city || "-"}{company.address?.state ? ` / ${company.address.state}` : ""}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-slate-400 uppercase tracking-wide">Responsavel</div>
                    <div>{company.owner?.fullName || "-"} {company.owner?.cpf ? `(${company.owner.cpf})` : ""}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-slate-400 uppercase tracking-wide">Contato</div>
                    <div>{company.address?.mainMobile || company.address?.mainPhone || company.address?.mainEmail || "-"}</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleStartEdit(company);
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 h-9 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Pencil size={14} />
                    ALTERAR
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleDelete(company);
                    }}
                    disabled={deletingCompanyId === company.id}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 h-9 text-[11px] font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                    {deletingCompanyId === company.id ? "EXCLUINDO" : "EXCLUIR"}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className={`${panelClass} hidden md:block`}>
          <table className="w-full border-collapse text-[11px] min-w-[1100px]">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wide">
              <tr>
                <th className="px-3 py-2 text-left w-8">#</th>
                <th className="px-3 py-2 text-left">Empresa</th>
                <th className="px-3 py-2 text-left w-40">CNPJ</th>
                <th className="px-3 py-2 text-left w-48">Responsavel</th>
                <th className="px-3 py-2 text-left w-36">Cidade/UF</th>
                <th className="px-3 py-2 text-left w-40">Contato</th>
                <th className="px-3 py-2 text-right w-40">Acao</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-3 py-4 text-center text-slate-400">
                    Carregando empresas...
                  </td>
                </tr>
              ) : filteredCompanies.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-4 text-center text-slate-400">
                    Nenhuma empresa encontrada.
                  </td>
                </tr>
              ) : (
                filteredCompanies.map((company, index) => (
                  <tr
                    key={company.id}
                    onClick={() => setSelectedCompany(company)}
                    className={`${index % 2 === 0 ? "bg-white" : "bg-slate-50"} cursor-pointer hover:bg-sky-50/40`}
                  >
                    <td className="px-3 py-2 align-middle text-slate-500">{index + 1}</td>
                    <td className="px-3 py-2 align-middle">
                      <div className="font-semibold text-slate-800">{getCompanyDisplayName(company)}</div>
                      <div className="text-slate-500">{company.legalName || "-"}</div>
                    </td>
                    <td className="px-3 py-2 align-middle text-slate-700">{company.cnpj || "-"}</td>
                    <td className="px-3 py-2 align-middle text-slate-700">
                      {company.owner?.fullName || "-"} {company.owner?.cpf ? `(${company.owner.cpf})` : ""}
                    </td>
                    <td className="px-3 py-2 align-middle text-slate-700">
                      {company.address?.city || "-"}{company.address?.state ? ` / ${company.address.state}` : ""}
                    </td>
                    <td className="px-3 py-2 align-middle text-slate-700">
                      {company.address?.mainMobile || company.address?.mainPhone || company.address?.mainEmail || "-"}
                    </td>
                    <td className="px-3 py-2 align-middle text-right">
                      <div className="inline-flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleStartEdit(company);
                          }}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 h-9 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          <Pencil size={14} />
                          ALTERAR
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleDelete(company);
                          }}
                          disabled={deletingCompanyId === company.id}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 h-9 text-[11px] font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                        >
                          <Trash2 size={14} />
                          {deletingCompanyId === company.id ? "EXCLUINDO" : "EXCLUIR"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

          {selectedCompany ? (
            <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4" onClick={() => setSelectedCompany(null)}>
              <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-4 md:p-5 shadow-2xl space-y-4" onClick={(event) => event.stopPropagation()}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold text-slate-900">Ficha da Empresa</div>
                    <div className="text-[12px] text-slate-500">{getCompanyDisplayName(selectedCompany)}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedCompany(null)}
                    className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-3 h-9 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    FECHAR
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[12px] text-slate-700">
                  <div>
                    <div className="text-slate-400 uppercase tracking-wide">CNPJ</div>
                    <div>{selectedCompany.cnpj || "-"}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 uppercase tracking-wide">Responsavel</div>
                    <div>{selectedCompany.owner?.fullName || "-"} {selectedCompany.owner?.cpf ? `(${selectedCompany.owner.cpf})` : ""}</div>
                  </div>
                  <div className="md:col-span-2">
                    <div className="text-slate-400 uppercase tracking-wide">Endereco</div>
                    <div>
                      {[selectedCompany.address?.street, selectedCompany.address?.number].filter(Boolean).join(", ") || "-"}
                      {selectedCompany.address?.city ? ` - ${selectedCompany.address.city}` : ""}
                      {selectedCompany.address?.state ? ` / ${selectedCompany.address.state}` : ""}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400 uppercase tracking-wide">CEP</div>
                    <div>{selectedCompany.address?.zipCode || "-"}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 uppercase tracking-wide">Contato</div>
                    <div>{selectedCompany.address?.mainMobile || selectedCompany.address?.mainPhone || selectedCompany.address?.mainEmail || "-"}</div>
                  </div>
                </div>

                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      handleStartEdit(selectedCompany);
                      setSelectedCompany(null);
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 h-9 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Pencil size={14} />
                    EDITAR
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDeleteFromFicha()}
                    disabled={deletingCompanyId === selectedCompany.id}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 h-9 text-[11px] font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                    {deletingCompanyId === selectedCompany.id ? "EXCLUINDO" : "EXCLUIR"}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
