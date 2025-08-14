'use client';

import { Suspense, useState, useEffect } from 'react';

import styles from './page.module.css';
import TabManager from './TabManager';
import { ProjectProvider } from 'projectManager/useProjectManager';
import { ImageGenProvider } from 'app/components/remake/ImageRequestManager';
import { ElementGenModalContextProvider } from 'app/components/remake/ElementGenModal/ElementGenModalContext';
import { ElementSelectionProvider } from './components/remake/ElementList/ElementSelectionManager';
import { getIAPAuthInfo } from 'services/backend';

export const Tabs = () => {
    const [userInfo, setUserInfo] = useState();

    useEffect(() => {
        getIAPAuthInfo().then(res => {
            console.log("userInfo:", res)
            setUserInfo(res)
        })
    }, [])

    return (
    <div className={styles.page}>
        <main className={styles.main}>
            <Suspense 
                fallback={
                    <div className={styles.loading}>Loading...</div>
                }
            >
                <TabManager userInfo={userInfo}/>
            </Suspense>
        </main>
    </div>
)}

export default function Home() {
    return (
        <ProjectProvider>
            <ImageGenProvider>
                <ElementGenModalContextProvider>
                    <ElementSelectionProvider>
                        <Tabs/>
                    </ElementSelectionProvider>
                </ElementGenModalContextProvider>
            </ImageGenProvider>
        </ProjectProvider>
    );
}
