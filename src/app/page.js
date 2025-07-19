'use client';

import { Suspense } from 'react';
import styles from './page.module.css';
import TabManager from './TabManager';
import { ProjectProvider } from 'projectManager/useProjectManager';
import { ImageGenProvider } from 'app/components/remake/ImageRequestManager';
import { ElementGenModalContextProvider } from 'app/components/remake/ElementGenModal/ElementGenModalContext';

export default function Home() {
    return (
        <ProjectProvider>
            <ImageGenProvider>
                <ElementGenModalContextProvider>
                    <div className={styles.page}>
                        <main className={styles.main}>
                            <Suspense 
                                fallback={
                                    <div className={styles.loading}>Loading...</div>
                                }
                            >
                                <TabManager />
                            </Suspense>
                        </main>
                    </div>
                </ElementGenModalContextProvider>
            </ImageGenProvider>
        </ProjectProvider>
    );
}
