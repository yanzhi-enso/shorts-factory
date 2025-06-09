'use client';

import { Suspense } from 'react';
import styles from './page.module.css';
import TabManager from './components/TabManager';

export default function Home() {
    return (
        <div className={styles.page}>
            <main className={styles.main}>
                <h1 className={styles.title}>TikTok Video Processor</h1>
                
                <Suspense 
                    fallback={
                        <div className={styles.loading}>Loading...</div>
                    }
                >
                    <TabManager />
                </Suspense>
            </main>
        </div>
    );
}
