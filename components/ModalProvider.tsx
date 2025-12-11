'use client';

import { ModalProvider as ModalContextProvider } from '@/context/ModalContext';
import Modal from './Modal';
import { ReactNode } from 'react';

export default function ModalProvider({ children }: { children: ReactNode }) {
    return (
        <ModalContextProvider>
            {children}
            <Modal />
        </ModalContextProvider>
    );
}
