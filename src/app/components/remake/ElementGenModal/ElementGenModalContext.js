// this is ctx for element image gen modal
import { 
    createContext, useContext, useReducer, useCallback
} from 'react';

// Action types
const MODAL_ACTIONS = {
    OPEN_MODAL: 'OPEN_MODAL',
    CLOSE_MODAL: 'CLOSE_MODAL',
};

// Initial state
const initialState = {
    isOpen: false,
    prefillData: null,
};

// Reducer
function modalReducer(state, action) {
    switch (action.type) {
        case MODAL_ACTIONS.OPEN_MODAL:
            return {
                ...state,
                isOpen: true,
                prefillData: action.payload,
            };

        case MODAL_ACTIONS.CLOSE_MODAL:
            return {
                ...state,
                isOpen: false,
                prefillData: null,
            };

        default:
            return state;
    }
}

// Context
const modalCtx = createContext();

// Provider component
export const ElementGenModalContextProvider = ({ children }) => {
    const [state, dispatch] = useReducer(modalReducer, initialState);

    /**
     * Opens the element image generation modal with optional prefill data
     * @param {Object} prefillData - Optional data to prefill the modal
     * @param {string} prefillData.initialTab - Which tab to open ('prompt' | 'inpainting')
     * @param {string} prefillData.prompt - Text prompt to prefill
     * @param {Array} prefillData.srcImages - Array of source images [{url: string} | {base64: string}]
     * @param {string} prefillData.mask - Base64 mask data for inpainting (optional)
     * @param {string} prefillData.sourceRecordId - ID of the original image record (for reference)
     */
    const openModal = useCallback((prefillData = null) => {
        dispatch({
            type: MODAL_ACTIONS.OPEN_MODAL,
            payload: prefillData
        });
    }, []);

    const closeModal = useCallback(() => {
        dispatch({
            type: MODAL_ACTIONS.CLOSE_MODAL,
        });
    }, []);

    const contextValue = {
        // Modal state
        // isModalOpen, 
        ...state,
        
        // Modal management
        openModal,
        closeModal,
    };

    return (
        <modalCtx.Provider value={contextValue}>
            {children}
        </modalCtx.Provider>
    );
};

// Hook for consuming components
export const useElementGenModalContext = () => {
    const context = useContext(modalCtx);
    if (!context) {
        throw new Error(
            'useElementGenModalContext must be used within an ElementGenModalContextProvider'
        );
    }
    return context;
};
