"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Building2, MapPin, Pencil, Save, Search, Trash2, UserRound } from "lucide-react";
import { ClientApiService, ClientPersonType, CreateClientInput, ClientRecord } from "@/lib/clientApiService";

const sectionCardClass = "bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-5 space-y-4";
const panelClass = "rounded-2xl border border-slate-200 overflow-x-auto bg-white";
const inputClass =
  "h-10 rounded-xl border border-slate-300 bg-white px-3 text-[12px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500";

type ClientFormState = CreateClientInput & {
  address: NonNullable<CreateClientInput["address"]>;
};

function norm(value: unknown) {
  return String(value || "").trim();
}

function upper(value: unknown) {
  return norm(value).toUpperCase();
}

function digitsOnly(value: unknown) {
  return norm(value).replace(/\D/g, "");
}

function buildInitialForm(prefillName: string, prefillDocument: string): ClientFormState {
  const digits = digitsOnly(prefillDocument);
  const personType: ClientPersonType = digits.length === 11 ? "INDIVIDUAL" : "COMPANY";

  return {
    personType,
    fullName: personType === "INDIVIDUAL" ? prefillName : "",
    cpf: personType === "INDIVIDUAL" ? prefillDocument : "",
    rg: "",
    birthDate: "",
    legalName: personType === "COMPANY" ? prefillName : "",
    tradeName: personType === "COMPANY" ? prefillName : "",
    cnpj: personType === "COMPANY" ? prefillDocument : "",
    stateRegistration: "",
    municipalRegistration: "",
    businessActivity: "",
    cnae: "",
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

function buildFormFromClient(client: ClientRecord): ClientFormState {
  return {
    personType: client.personType === "COMPANY" ? "COMPANY" : "INDIVIDUAL",
    fullName: norm(client.fullName),
    cpf: norm(client.cpf),
    rg: norm(client.rg),
    birthDate: norm(client.birthDate),
    legalName: norm(client.legalName),
    tradeName: norm(client.tradeName),
    cnpj: norm(client.cnpj),
    stateRegistration: norm(client.stateRegistration),
    municipalRegistration: norm(client.municipalRegistration),
    businessActivity: norm(client.businessActivity),
    cnae: norm(client.cnae),
    address: {
      zipCode: norm(client.address?.zipCode),
      street: norm(client.address?.street),
      number: norm(client.address?.number),
      complement: norm(client.address?.complement),
      district: norm(client.address?.district),
      city: norm(client.address?.city),
      state: norm(client.address?.state),
      mainEmail: norm(client.address?.mainEmail),
      mainMobile: norm(client.address?.mainMobile),
      mainPhone: norm(client.address?.mainPhone),
    },
  };
}

function getClientDisplayName(client: ClientRecord) {
  return norm(client.nome || client.tradeName || client.legalName || client.fullName);
}

function CadastroClientesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const returnTo = norm(searchParams.get("returnTo"));
  const prefillName = norm(searchParams.get("prefillName"));
  const prefillDocument = norm(searchParams.get("prefillDocument"));

  const [form, setForm] = useState<ClientFormState>(() => buildInitialForm(prefillName, prefillDocument));
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<ClientRecord | null>(null);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [loadError, setLoadError] = useState("");
  const [cpfModalMessage, setCpfModalMessage] = useState("");
  const [showCpfModal, setShowCpfModal] = useState(false);

  useEffect(() => {
    setForm(buildInitialForm(prefillName, prefillDocument));
  }, [prefillDocument, prefillName]);

  const loadClients = async () => {
    try {
      setLoading(true);
      const data = await ClientApiService.listClients();
      setClients(Array.isArray(data) ? data : []);
      setLoadError("");
    } catch (error: any) {
      console.error("Falha ao carregar clientes:", error);
      setLoadError(String(error?.message || "Falha ao carregar clientes."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadClients();
  }, []);

  const filteredClients = useMemo(() => {
    const q = upper(search);
    if (!q) return clients;

    return clients.filter((client) => {
      const haystack = [
        getClientDisplayName(client),
        client.personType === "COMPANY" ? "JURIDICA" : "FISICA",
        client.cnpj,
        client.cpf,
        client.address?.city,
        client.address?.state,
      ]
        .filter(Boolean)
        .join(" ");

      return upper(haystack).includes(q);
    });
  }, [clients, search]);

  const updateField = (field: keyof ClientFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setMessage("");
  };

  const updateAddressField = (field: keyof ClientFormState["address"], value: string) => {
    setForm((prev) => ({
      ...prev,
      address: {
        ...prev.address,
        [field]: value,
      },
    }));
    setMessage("");
  };

  const handleChangePersonType = (personType: ClientPersonType) => {
    setForm((prev) => ({
      ...prev,
      personType,
      fullName: personType === "INDIVIDUAL" ? prev.fullName : "",
      cpf: personType === "INDIVIDUAL" ? prev.cpf : "",
      rg: personType === "INDIVIDUAL" ? prev.rg : "",
      birthDate: personType === "INDIVIDUAL" ? prev.birthDate : "",
      legalName: personType === "COMPANY" ? prev.legalName : "",
      tradeName: personType === "COMPANY" ? prev.tradeName : "",
      cnpj: personType === "COMPANY" ? prev.cnpj : "",
      stateRegistration: personType === "COMPANY" ? prev.stateRegistration : "",
      municipalRegistration: personType === "COMPANY" ? prev.municipalRegistration : "",
      businessActivity: personType === "COMPANY" ? prev.businessActivity : "",
      cnae: personType === "COMPANY" ? prev.cnae : "",
    }));
    setMessage("");
  };

  const handleUseClient = (client: ClientRecord) => {
    if (!returnTo) return;
    router.push(`${returnTo}?clientName=${encodeURIComponent(getClientDisplayName(client))}`);
  };

  const handleStartEdit = (client: ClientRecord) => {
    setEditingClientId(client.id);
    setForm(buildFormFromClient(client));
    setMessage("Cliente carregado para alteracao.");
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleCancelEdit = () => {
    setEditingClientId(null);
    setForm(buildInitialForm(prefillName, prefillDocument));
    setMessage("");
  };

  const handleDelete = async (client: ClientRecord) => {
    const confirmText = `Excluir cliente "${getClientDisplayName(client)}"?`;
    if (!window.confirm(confirmText)) return;

    try {
      setDeletingClientId(client.id);
      await ClientApiService.deleteClient(client.id);
      setClients((prev) => prev.filter((item) => item.id !== client.id));
      if (editingClientId === client.id) {
        setEditingClientId(null);
        setForm(buildInitialForm(prefillName, prefillDocument));
      }
      setMessage("Cliente excluido com sucesso.");
    } catch (error: any) {
      console.error("Falha ao excluir cliente:", error);
      setMessage(String(error?.message || "Falha ao excluir cliente."));
    } finally {
      setDeletingClientId(null);
    }
  };

  const handleDeleteFromFicha = async () => {
    if (!selectedClient) return;
    const targetId = selectedClient.id;
    await handleDelete(selectedClient);
    setSelectedClient((prev) => (prev?.id === targetId ? null : prev));
  };

  const isDuplicateCpfError = (rawMessage: string) => {
    const normalized = upper(rawMessage);
    if (!normalized.includes("CPF")) return false;
    return normalized.includes("JA EXISTE") || normalized.includes("DUPLIC") || normalized.includes("UNIQUE");
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);
      setMessage("");

      const payload: CreateClientInput = {
        ...form,
        address: { ...form.address },
      };

      const saved = editingClientId
        ? await ClientApiService.updateClient(editingClientId, payload)
        : await ClientApiService.createClient(payload);

      setClients((prev) => {
        const withoutCurrent = prev.filter((item) => item.id !== saved.id);
        return [saved, ...withoutCurrent];
      });

      if (returnTo) {
        router.push(`${returnTo}?clientName=${encodeURIComponent(getClientDisplayName(saved))}`);
        return;
      }

      setMessage(editingClientId ? "Cliente alterado com sucesso." : "Cliente cadastrado com sucesso.");
      setEditingClientId(null);
      setForm(buildInitialForm("", ""));
    } catch (error: any) {
      const errorMessage = String(error?.message || "Falha ao salvar cliente.");
      if (isDuplicateCpfError(errorMessage)) {
        setCpfModalMessage(errorMessage);
        setShowCpfModal(true);
        console.warn("CPF duplicado no cadastro de cliente:", errorMessage);
      } else {
        console.error("Falha ao salvar cliente:", error);
      }
      setMessage(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="w-full min-w-0 px-4 md:px-6 py-4">
        <div className="mx-auto w-full max-w-[1400px] min-w-0 space-y-4">
          <section className={sectionCardClass}>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Cadastro de Clientes</h1>
            <p className="text-[12px] text-slate-500 mt-1">
              Cadastro centralizado para clientes PF/PJ com endereço completo.
            </p>
          </div>
          {returnTo ? (
            <button
              type="button"
              onClick={() => router.push(returnTo)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 h-10 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft size={16} />
              VOLTAR PARA NF
            </button>
          ) : null}
        </div>

        {returnTo ? (
          <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-3 text-[12px] text-slate-700">
            Este cadastro foi aberto a partir da tela de produtos. Ao salvar, o sistema volta para a NF com o cliente carregado.
          </div>
        ) : null}
          </section>

          <section className={sectionCardClass}>
        <div className="flex items-center gap-2 text-slate-800">
          {form.personType === "COMPANY" ? <Building2 size={18} /> : <UserRound size={18} />}
          <h2 className="text-sm font-semibold">Dados do Cliente</h2>
        </div>

        {editingClientId ? (
          <div className="rounded-2xl border border-sky-200 bg-sky-50 px-3 py-2 text-[12px] text-sky-900">
            Modo alteracao ativo. Salve para atualizar o cliente ou cancele para voltar ao cadastro novo.
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleChangePersonType("COMPANY")}
            className={`h-9 px-3 rounded-xl text-[11px] font-semibold border ${form.personType === "COMPANY" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
          >
            PESSOA JURIDICA
          </button>
          <button
            type="button"
            onClick={() => handleChangePersonType("INDIVIDUAL")}
            className={`h-9 px-3 rounded-xl text-[11px] font-semibold border ${form.personType === "INDIVIDUAL" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
          >
            PESSOA FISICA
          </button>
        </div>

        {form.personType === "COMPANY" ? (
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
        ) : (
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-12 md:col-span-5 flex flex-col gap-1.5">
              <label className="text-[11px] font-medium text-slate-600 tracking-wide">NOME COMPLETO</label>
              <input className={inputClass} value={form.fullName || ""} onChange={(e) => updateField("fullName", e.target.value)} />
            </div>
            <div className="col-span-12 md:col-span-3 flex flex-col gap-1.5">
              <label className="text-[11px] font-medium text-slate-600 tracking-wide">CPF</label>
              <input className={inputClass} value={form.cpf || ""} onChange={(e) => updateField("cpf", e.target.value)} />
            </div>
            <div className="col-span-12 md:col-span-2 flex flex-col gap-1.5">
              <label className="text-[11px] font-medium text-slate-600 tracking-wide">RG</label>
              <input className={inputClass} value={form.rg || ""} onChange={(e) => updateField("rg", e.target.value)} />
            </div>
            <div className="col-span-12 md:col-span-2 flex flex-col gap-1.5">
              <label className="text-[11px] font-medium text-slate-600 tracking-wide">NASCIMENTO</label>
              <input type="date" className={inputClass} value={form.birthDate || ""} onChange={(e) => updateField("birthDate", e.target.value)} />
            </div>
          </div>
        )}
      </section>

      <section className={sectionCardClass}>
        <div className="flex items-center gap-2 text-slate-800">
          <MapPin size={18} />
          <h2 className="text-sm font-semibold">Endereco e Contato</h2>
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
              setEditingClientId(null);
              setForm(buildInitialForm(prefillName, prefillDocument));
              setMessage("");
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 h-10 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
          >
            LIMPAR
          </button>
          {editingClientId ? (
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
            {saving ? "SALVANDO" : editingClientId ? "SALVAR ALTERACOES" : returnTo ? "SALVAR CLIENTE E VOLTAR" : "SALVAR CLIENTE"}
          </button>
        </div>
          </section>

          <section className={sectionCardClass}>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Clientes Cadastrados</h2>
            <p className="text-[12px] text-slate-500 mt-1">Consulta rapida de clientes PF/PJ cadastrados no banco.</p>
          </div>
          <div className="w-full md:w-80 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              className={`${inputClass} pl-9 w-full`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar por nome, CPF/CNPJ ou cidade"
            />
          </div>
        </div>

        {loadError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">{loadError}</div>
        ) : null}

        <div className="space-y-3 md:hidden">
          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-3 py-4 text-center text-[12px] text-slate-400">
              Carregando clientes...
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-3 py-4 text-center text-[12px] text-slate-400">
              Nenhum cliente encontrado.
            </div>
          ) : (
            filteredClients.map((client) => (
              <div
                key={client.id}
                onClick={() => setSelectedClient(client)}
                className="rounded-2xl border border-slate-200 bg-white p-3 space-y-3 cursor-pointer hover:border-sky-200"
              >
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-slate-800">{getClientDisplayName(client)}</div>
                  <div className="text-[11px] text-slate-500">{client.personType === "COMPANY" ? "JURIDICA" : "FISICA"}</div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-[11px] text-slate-700">
                  <div>
                    <div className="text-slate-400 uppercase tracking-wide">Documento</div>
                    <div>{client.cnpj || client.cpf || "-"}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 uppercase tracking-wide">Cidade/UF</div>
                    <div>{client.address?.city || "-"}{client.address?.state ? ` / ${client.address.state}` : ""}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-slate-400 uppercase tracking-wide">Contato</div>
                    <div>{client.address?.mainMobile || client.address?.mainPhone || client.address?.mainEmail || "-"}</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {returnTo ? (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleUseClient(client);
                      }}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 h-9 text-[11px] font-semibold text-sky-700 hover:bg-sky-100"
                    >
                      USAR NA NF
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleStartEdit(client);
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
                      void handleDelete(client);
                    }}
                    disabled={deletingClientId === client.id}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 h-9 text-[11px] font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                    {deletingClientId === client.id ? "EXCLUINDO" : "EXCLUIR"}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className={`${panelClass} hidden md:block`}>
          <table className="w-full border-collapse text-[11px] min-w-[980px]">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wide">
              <tr>
                <th className="px-3 py-2 text-left w-8">#</th>
                <th className="px-3 py-2 text-left">Cliente</th>
                <th className="px-3 py-2 text-left w-24">Tipo</th>
                <th className="px-3 py-2 text-left w-40">Documento</th>
                <th className="px-3 py-2 text-left w-36">Cidade/UF</th>
                <th className="px-3 py-2 text-left w-40">Contato</th>
                <th className="px-3 py-2 text-right w-56">Acao</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-3 py-4 text-center text-slate-400">
                    Carregando clientes...
                  </td>
                </tr>
              ) : filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-4 text-center text-slate-400">
                    Nenhum cliente encontrado.
                  </td>
                </tr>
              ) : (
                filteredClients.map((client, index) => (
                  <tr
                    key={client.id}
                    onClick={() => setSelectedClient(client)}
                    className={`${index % 2 === 0 ? "bg-white" : "bg-slate-50"} cursor-pointer hover:bg-sky-50/40`}
                  >
                    <td className="px-3 py-2 align-middle text-slate-500">{index + 1}</td>
                    <td className="px-3 py-2 align-middle">
                      <div className="font-semibold text-slate-800">{getClientDisplayName(client)}</div>
                      <div className="text-slate-500">{client.legalName || client.fullName || "-"}</div>
                    </td>
                    <td className="px-3 py-2 align-middle text-slate-700">{client.personType === "COMPANY" ? "JURIDICA" : "FISICA"}</td>
                    <td className="px-3 py-2 align-middle text-slate-700">{client.cnpj || client.cpf || "-"}</td>
                    <td className="px-3 py-2 align-middle text-slate-700">
                      {client.address?.city || "-"}{client.address?.state ? ` / ${client.address.state}` : ""}
                    </td>
                    <td className="px-3 py-2 align-middle text-slate-700">
                      {client.address?.mainMobile || client.address?.mainPhone || client.address?.mainEmail || "-"}
                    </td>
                    <td className="px-3 py-2 align-middle text-right">
                      <div className="inline-flex flex-wrap justify-end gap-2">
                        {returnTo ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleUseClient(client);
                            }}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 h-9 text-[11px] font-semibold text-sky-700 hover:bg-sky-100"
                          >
                            USAR NA NF
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleStartEdit(client);
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
                            void handleDelete(client);
                          }}
                          disabled={deletingClientId === client.id}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 h-9 text-[11px] font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                        >
                          <Trash2 size={14} />
                          {deletingClientId === client.id ? "EXCLUINDO" : "EXCLUIR"}
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

          {selectedClient ? (
            <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4" onClick={() => setSelectedClient(null)}>
              <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-4 md:p-5 shadow-2xl space-y-4" onClick={(event) => event.stopPropagation()}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold text-slate-900">Ficha do Cliente</div>
                    <div className="text-[12px] text-slate-500">{getClientDisplayName(selectedClient)}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedClient(null)}
                    className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-3 h-9 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    FECHAR
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[12px] text-slate-700">
                  <div>
                    <div className="text-slate-400 uppercase tracking-wide">Tipo</div>
                    <div>{selectedClient.personType === "COMPANY" ? "JURIDICA" : "FISICA"}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 uppercase tracking-wide">Documento</div>
                    <div>{selectedClient.cnpj || selectedClient.cpf || "-"}</div>
                  </div>
                  <div className="md:col-span-2">
                    <div className="text-slate-400 uppercase tracking-wide">Endereco</div>
                    <div>
                      {[selectedClient.address?.street, selectedClient.address?.number].filter(Boolean).join(", ") || "-"}
                      {selectedClient.address?.city ? ` - ${selectedClient.address.city}` : ""}
                      {selectedClient.address?.state ? ` / ${selectedClient.address.state}` : ""}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400 uppercase tracking-wide">CEP</div>
                    <div>{selectedClient.address?.zipCode || "-"}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 uppercase tracking-wide">Contato</div>
                    <div>{selectedClient.address?.mainMobile || selectedClient.address?.mainPhone || selectedClient.address?.mainEmail || "-"}</div>
                  </div>
                </div>

                <div className="flex flex-wrap justify-end gap-2">
                  {returnTo ? (
                    <button
                      type="button"
                      onClick={() => handleUseClient(selectedClient)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 h-9 text-[11px] font-semibold text-sky-700 hover:bg-sky-100"
                    >
                      USAR NA NF
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => {
                      handleStartEdit(selectedClient);
                      setSelectedClient(null);
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 h-9 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Pencil size={14} />
                    EDITAR
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDeleteFromFicha()}
                    disabled={deletingClientId === selectedClient.id}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 h-9 text-[11px] font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                    {deletingClientId === selectedClient.id ? "EXCLUINDO" : "EXCLUIR"}
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {showCpfModal ? (
            <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4" onClick={() => setShowCpfModal(false)}>
              <div
                className="w-full max-w-md rounded-2xl border border-rose-200 bg-white p-4 md:p-5 shadow-2xl space-y-3"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="text-base font-semibold text-slate-900">CPF ja cadastrado</div>
                <div className="text-[12px] text-slate-700">
                  {cpfModalMessage || "Ja existe cliente cadastrado com este CPF."}
                </div>
                <div className="text-[12px] text-slate-600">
                  Use outro CPF ou abra o cliente existente para editar.
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowCpfModal(false)}
                    className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-3 h-9 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    FECHAR
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

export default function CadastroClientesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50">
          <div className="w-full min-w-0 px-4 md:px-6 py-4">
            <div className="mx-auto w-full max-w-[1400px] min-w-0 space-y-4">
              <section className={sectionCardClass}>Carregando...</section>
            </div>
          </div>
        </div>
      }
    >
      <CadastroClientesContent />
    </Suspense>
  );
}
