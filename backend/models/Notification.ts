// Notification Models

export interface Notification {
  id: string;
  type: 'orcamento' | 'recebimento' | 'pre-analise' | 'nfe' | 'alerta' | 'sucesso' | 'cadastro';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  link?: string;
  permission?: string;
}

export interface CreateNotificationDTO {
  type: Notification['type'];
  title: string;
  message: string;
  link?: string;
  permission?: string;
}

export interface MarkAsReadDTO {
  notificationIds: string[];
}
