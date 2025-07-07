'use client';

import { Suspense } from 'react';
import styles from './page.module.css';
import TabManager from './components/TabManager';
import { ProjectProvider } from 'projectManager/useProjectManager';
import { ImageGenProvider } from 'imageGenManager/ImageGenProvider';

export default function Home() {
    return (
        <ProjectProvider>
            <ImageGenProvider>
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
            </ImageGenProvider>
        </ProjectProvider>
    );
}
