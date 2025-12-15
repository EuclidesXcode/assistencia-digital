// NF-e XML Models

export interface NfeXml {
  id: string;
  chave: string;
  numeroNF: string;
  emissao: string;
  itens: number;
  status: 'processada' | 'pendente' | 'erro';
  xmlData?: string;
}

export interface UploadNfeDTO {
  xmlFile: File | string;
}

export interface ProcessNfeResponse {
  id: string;
  chave: string;
  numeroNF: string;
  emissao: string;
  itens: number;
  status: 'processada' | 'erro';
  message?: string;
}
