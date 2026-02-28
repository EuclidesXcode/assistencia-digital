
'use client';

import React, { useRef, useState } from 'react';
import { Camera, X, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from './Button';
import { processImageToBase64 } from '@/lib/image';

interface CameraCaptureProps {
    onCapture: (imageUrl: string) => void;
    folder?: string;
    label?: string;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({
    onCapture,
    folder = 'general',
    label = 'Adicionar Foto'
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);
    const [savedBase64, setSavedBase64] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Create local preview immediately
        const objectUrl = URL.createObjectURL(file);
        setPreview(objectUrl);
        setSavedBase64(null);
        setError(null);
        setProcessing(true);

        try {
            // Optimize image (resize to HD) and convert to base64
            const base64 = await processImageToBase64(file);
            setSavedBase64(base64);
            onCapture(base64);
        } catch (err) {
            console.error('Error processing image:', err);
            setError('Erro ao processar imagem.');
        } finally {
            setProcessing(false);
        }
    };

    const clearImage = () => {
        setPreview(null);
        setSavedBase64(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        onCapture(''); // Clear in parent
    };

    const triggerCamera = () => {
        fileInputRef.current?.click();
    };


    return (
        <div className="w-full">
            <input
                type="file"
                accept="image/*"
                capture="environment" // Prefer rear camera on mobile
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileSelect}
            />

            {!preview ? (
                <button
                    onClick={triggerCamera}
                    type="button"
                    className="w-full h-32 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center text-slate-500 hover:border-primary-500 hover:text-primary-500 transition-colors bg-slate-50 hover:bg-slate-100"
                >
                    <Camera size={32} className="mb-2" />
                    <span className="font-medium text-sm">{label}</span>
                    <span className="text-xs text-slate-400 mt-1">Toque para abrir a câmera</span>
                </button>
            ) : (
                <div className="relative w-full rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                    <img
                        src={preview}
                        alt="Preview"
                        className="w-full h-48 object-cover"
                    />

                    {/* Overlay Actions */}
                    <div className="absolute top-2 right-2 flex gap-2">
                        <button
                            onClick={clearImage}
                            className="p-1.5 bg-white/90 rounded-full text-slate-600 hover:text-red-600 shadow-sm backdrop-blur-sm"
                            type="button"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {/* Status Bar */}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm p-2 flex items-center justify-between">
                        {processing ? (
                            <span className="text-white text-xs flex items-center gap-2">
                                <Loader2 size={14} className="animate-spin" />
                                Processando...
                            </span>
                        ) : savedBase64 ? (
                            <span className="text-emerald-400 text-xs flex items-center gap-2 font-medium">
                                <CheckCircle size={14} />
                                Imagem pronta
                            </span>
                        ) : error ? (
                            <span className="text-red-400 text-xs font-medium">
                                {error}
                            </span>
                        ) : (
                            <span className="text-white/80 text-xs">Aguardando...</span>
                        )}

                    </div>
                </div>
            )}
        </div>
    );
};
