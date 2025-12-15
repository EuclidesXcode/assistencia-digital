import { Produto } from '../models/PreAnalise';

export const mockPendentes: Produto[] = [
    { id: "A1234567", data: "25/09/2025", recebidoPor: "EDUARDO", codigoNF: "5313546", modeloRef: "TV 50 LG 4K UHD 50UT8050PSA WIFI BT HDMI", gtin: "7893299951862", nfReceb: "000123" },
    { id: "B7654321", data: "26/09/2025", recebidoPor: "FERNANDA", codigoNF: "5331250", modeloRef: "TV 32 PHILCO PTV32M9GACGB LED HDMI USB WIFI", gtin: "7891356122613", nfReceb: "000456" },
    { id: "C0000001", data: "26/09/2025", recebidoPor: "ADRIANO", codigoNF: "5342279", modeloRef: "TV 65 HISENSE UHD 4K DLED 65A6N 65A51HUV 1000", gtin: "7908842834391", nfReceb: "000789" },
    { id: "D2222222", data: "27/09/2025", recebidoPor: "CARLOS", codigoNF: "5277914", modeloRef: "TV 55 QNED 4K LG 55QNED80SRA", gtin: "7893299928895", nfReceb: "000321" },
];

export const mockResultados: Produto[] = [
    { id: "R100001", data: "20/09/2025", recebidoPor: "EDUARDO", codigoNF: "5300001", modeloRef: "TV 43 EXEMPLO", gtin: "7890001110001", nfReceb: "100001" },
    { id: "R100002", data: "21/09/2025", recebidoPor: "FERNANDA", codigoNF: "5300002", modeloRef: "TV 50 EXEMPLO", gtin: "7890001110002", nfReceb: "100002" },
];
