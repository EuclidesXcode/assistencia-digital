'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

export type ModalVariant = 'default' | 'success' | 'error' | 'confirm';

export interface ModalConfig {
    title: string;
    message: string;
    variant: ModalVariant;
    onConfirm?: () => void;
    onCancel?: () => void;
    confirmText?: string;
    cancelText?: string;
}

interface ModalContextType {
    isOpen: boolean;
    config: ModalConfig | null;
    showModal: (config: ModalConfig) => void;
    hideModal: () => void;
    showSuccess: (title: string, message: string) => void;
    showError: (title: string, message: string) => void;
    showConfirm: (title: string, message: string, onConfirm: () => void) => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [config, setConfig] = useState<ModalConfig | null>(null);

    const showModal = (modalConfig: ModalConfig) => {
        setConfig(modalConfig);
        setIsOpen(true);
    };

    const hideModal = () => {
        setIsOpen(false);
        setTimeout(() => setConfig(null), 300); // Wait for animation
    };

    const showSuccess = (title: string, message: string) => {
        showModal({
            title,
            message,
            variant: 'success',
        });
    };

    const showError = (title: string, message: string) => {
        showModal({
            title,
            message,
            variant: 'error',
        });
    };

    const showConfirm = (title: string, message: string, onConfirm: () => void) => {
        showModal({
            title,
            message,
            variant: 'confirm',
            onConfirm,
            confirmText: 'Confirmar',
            cancelText: 'Cancelar',
        });
    };

    return (
        <ModalContext.Provider
            value={{
                isOpen,
                config,
                showModal,
                hideModal,
                showSuccess,
                showError,
                showConfirm,
            }}
        >
            {children}
        </ModalContext.Provider>
    );
}

export function useModal() {
    const context = useContext(ModalContext);
    if (context === undefined) {
        throw new Error('useModal must be used within a ModalProvider');
    }
    return context;
}
