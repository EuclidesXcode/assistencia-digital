'use client';

import { useModal, ModalVariant } from '@/context/ModalContext';
import { CheckCircle2, XCircle, AlertCircle, X } from 'lucide-react';
import { useEffect } from 'react';

export default function Modal() {
    const { isOpen, config, hideModal } = useModal();

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!config) return null;

    const handleConfirm = () => {
        if (config.onConfirm) {
            config.onConfirm();
        }
        hideModal();
    };

    const handleCancel = () => {
        if (config.onCancel) {
            config.onCancel();
        }
        hideModal();
    };

    const getVariantStyles = (variant: ModalVariant) => {
        switch (variant) {
            case 'success':
                return {
                    icon: <CheckCircle2 className="w-16 h-16 text-green-500" />,
                    bgColor: 'bg-green-50',
                    borderColor: 'border-green-200',
                    buttonColor: 'bg-green-600 hover:bg-green-700',
                };
            case 'error':
                return {
                    icon: <XCircle className="w-16 h-16 text-red-500" />,
                    bgColor: 'bg-red-50',
                    borderColor: 'border-red-200',
                    buttonColor: 'bg-red-600 hover:bg-red-700',
                };
            case 'confirm':
                return {
                    icon: <AlertCircle className="w-16 h-16 text-yellow-500" />,
                    bgColor: 'bg-yellow-50',
                    borderColor: 'border-yellow-200',
                    buttonColor: 'bg-primary-600 hover:bg-primary-700',
                };
            default:
                return {
                    icon: <AlertCircle className="w-16 h-16 text-primary-500" />,
                    bgColor: 'bg-primary-50',
                    borderColor: 'border-primary-200',
                    buttonColor: 'bg-primary-600 hover:bg-primary-700',
                };
        }
    };

    const styles = getVariantStyles(config.variant);

    return (
        <div
            className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={config.variant === 'confirm' ? undefined : hideModal}
            />

            {/* Modal */}
            <div
                className={`relative bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all duration-300 ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
                    }`}
            >
                {/* Close button for non-confirm modals */}
                {config.variant !== 'confirm' && (
                    <button
                        onClick={hideModal}
                        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                        aria-label="Fechar"
                    >
                        <X className="w-6 h-6" />
                    </button>
                )}

                {/* Content */}
                <div className={`p-8 ${styles.bgColor} rounded-t-2xl border-b-2 ${styles.borderColor}`}>
                    <div className="flex flex-col items-center text-center">
                        <div className="mb-4">{styles.icon}</div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">{config.title}</h2>
                        <p className="text-gray-600 leading-relaxed">{config.message}</p>
                    </div>
                </div>

                {/* Actions */}
                <div className="p-6 bg-white rounded-b-2xl">
                    {config.variant === 'confirm' ? (
                        <div className="flex gap-3">
                            <button
                                onClick={handleCancel}
                                className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition-colors duration-200"
                            >
                                {config.cancelText || 'Cancelar'}
                            </button>
                            <button
                                onClick={handleConfirm}
                                className={`flex-1 px-6 py-3 ${styles.buttonColor} text-white font-semibold rounded-lg transition-colors duration-200`}
                            >
                                {config.confirmText || 'Confirmar'}
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={hideModal}
                            className={`w-full px-6 py-3 ${styles.buttonColor} text-white font-semibold rounded-lg transition-colors duration-200`}
                        >
                            OK
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
