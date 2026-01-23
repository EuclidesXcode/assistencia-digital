import { useState, useRef } from "react";
import { X, Plus, Trash2, Upload, Camera, FileText } from "lucide-react";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { ItemVinculado } from "@/backend/models/Product";

// Modal de Ajuda/Como Usar
export function ModalHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 relative animate-in fade-in zoom-in duration-200 max-h-[80vh] overflow-y-auto">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
                    <X size={20} />
                </button>

                <h2 className="text-2xl font-bold mb-4">Como Usar - Cadastro de Produto</h2>

                <div className="space-y-4 text-sm">
                    <section>
                        <h3 className="font-bold text-lg mb-2">1. Dados Básicos</h3>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Digite o <strong>EAN/GTIN</strong> do produto</li>
                            <li>O sistema buscará automaticamente se o produto já existe</li>
                            <li>Preencha <strong>Modelo Referência</strong> e <strong>Fabricante</strong></li>
                        </ul>
                    </section>

                    <section>
                        <h3 className="font-bold text-lg mb-2">2. Anexos do Produto</h3>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Adicione fotos do produto, etiqueta Procel e kit de acessórios</li>
                            <li>Faça upload do manual em PDF</li>
                        </ul>
                    </section>

                    <section>
                        <h3 className="font-bold text-lg mb-2">3. Códigos NF e Itens</h3>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Cadastre códigos NF por revenda</li>
                            <li>Adicione itens de embalagem, acessórios e funcionalidades</li>
                        </ul>
                    </section>

                    <section>
                        <h3 className="font-bold text-lg mb-2">4. Modelos Fabricante</h3>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Crie variantes de fabricação do produto</li>
                            <li>Para cada modelo, adicione peças estéticas, funcionais e recursos</li>
                            <li>Anexe documentos técnicos (vista explodida, boletim, manual)</li>
                        </ul>
                    </section>

                    <section>
                        <h3 className="font-bold text-lg mb-2">5. Salvar</h3>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Revise todos os dados na seção "Itens vinculados"</li>
                            <li>Use os filtros para visualizar por modelo</li>
                            <li>Clique em <strong>Salvar Alterações</strong></li>
                        </ul>
                    </section>
                </div>

                <Button onClick={onClose} className="w-full mt-6">Entendi</Button>
            </div>
        </div>
    );
}

// Modal de Fotos de Item
export function ModalItemFotos({
    open,
    onClose,
    item,
    onAddFoto,
    onRemoveFoto
}: {
    open: boolean;
    onClose: () => void;
    item: ItemVinculado & { fotos?: string[] };
    onAddFoto: (foto: string) => void;
    onRemoveFoto: (index: number) => void;
}) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!open) return null;

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                onAddFoto(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl p-6 relative animate-in fade-in zoom-in duration-200">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
                    <X size={20} />
                </button>

                <h2 className="text-xl font-bold mb-4">Fotos - {item.nome}</h2>

                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileUpload}
                />

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                    {(item.fotos || []).map((foto, idx) => (
                        <div key={idx} className="relative group">
                            <img src={foto} alt={`Foto ${idx + 1}`} className="w-full h-32 object-cover rounded-lg" />
                            <button
                                onClick={() => onRemoveFoto(idx)}
                                className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}

                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="h-32 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
                    >
                        <Plus size={24} className="text-slate-400" />
                        <span className="text-xs text-slate-500 mt-1">Adicionar Foto</span>
                    </button>
                </div>

                <Button onClick={onClose} variant="outline" className="w-full">Fechar</Button>
            </div>
        </div>
    );
}

// Modal de Anexos de Modelo
export function ModalModeloAnexos({
    open,
    onClose,
    modeloNome,
    anexoTipo,
    anexos,
    onAddAnexo,
    onRemoveAnexo
}: {
    open: boolean;
    onClose: () => void;
    modeloNome: string;
    anexoTipo: 'vistaExplodida' | 'boletimTecnico' | 'manualTecnico';
    anexos: string[];
    onAddAnexo: (url: string) => void;
    onRemoveAnexo: (index: number) => void;
}) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!open) return null;

    const tipoLabels = {
        vistaExplodida: 'Vista Explodida',
        boletimTecnico: 'Boletim Técnico',
        manualTecnico: 'Manual Técnico'
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                onAddAnexo(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 relative animate-in fade-in zoom-in duration-200">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
                    <X size={20} />
                </button>

                <h2 className="text-xl font-bold mb-2">{tipoLabels[anexoTipo]}</h2>
                <p className="text-sm text-slate-500 mb-4">Modelo: {modeloNome}</p>

                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*,application/pdf"
                    onChange={handleFileUpload}
                />

                <div className="space-y-3 mb-4">
                    {anexos.map((anexo, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                            <div className="flex items-center gap-2">
                                <FileText size={18} className="text-indigo-600" />
                                <span className="text-sm font-medium">Arquivo {idx + 1}</span>
                            </div>
                            <button
                                onClick={() => onRemoveAnexo(idx)}
                                className="text-red-500 hover:text-red-700"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                </div>

                <Button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full mb-3"
                >
                    <Upload size={16} className="mr-2" />
                    Adicionar Arquivo
                </Button>

                <Button onClick={onClose} variant="outline" className="w-full">Fechar</Button>
            </div>
        </div>
    );
}

// Modal de Seleção de Revenda/Cliente
export function ModalSearchRevenda({
    open,
    onClose,
    onSelect
}: {
    open: boolean;
    onClose: () => void;
    onSelect: (revenda: string) => void;
}) {
    const [search, setSearch] = useState("");

    // Mock data - em produção viria de uma API
    const revendas = [
        "MAGAZINE LUIZA",
        "CASAS BAHIA",
        "PONTO FRIO",
        "EXTRA",
        "CARREFOUR",
        "AMERICANAS",
        "SUBMARINO",
        "SHOPTIME"
    ].filter(r => r.toLowerCase().includes(search.toLowerCase()));

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 relative animate-in fade-in zoom-in duration-200">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
                    <X size={20} />
                </button>

                <h2 className="text-xl font-bold mb-4">Selecionar Revenda/Cliente</h2>

                <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Pesquisar revenda..."
                    className="mb-4"
                    autoFocus
                />

                <div className="space-y-2 max-h-64 overflow-y-auto">
                    {revendas.map((revenda, idx) => (
                        <button
                            key={idx}
                            onClick={() => {
                                onSelect(revenda);
                                onClose();
                            }}
                            className="w-full text-left p-3 rounded-lg hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 transition-colors"
                        >
                            <span className="font-medium text-sm">{revenda}</span>
                        </button>
                    ))}
                </div>

                {revendas.length === 0 && (
                    <div className="text-center py-8 text-slate-400">
                        Nenhuma revenda encontrada
                    </div>
                )}
            </div>
        </div>
    );
}
