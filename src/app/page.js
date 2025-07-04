'use client';

import { Suspense } from 'react';
import styles from './page.module.css';
import TabManager from './components/TabManager';
import { ProjectProvider } from '../hocs/ProjectManager';

export default function Home() {
    return (
        <ProjectProvider>
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
        </ProjectProvider>
    );
}
